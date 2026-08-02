import crypto from "node:crypto";
import { prisma } from "../db.js";
import { hashPassword } from "../auth/password.js";
import { signAccessToken } from "../auth/jwt.js";
import { createRefreshToken } from "../auth/refresh-token.js";
import { createTrialSubscription } from "../subscriptions/service.js";
import type { AuthUser } from "../../types.js";
import { TrialOtpError } from "./otp.js";
import { phoneToLoginEmail, phoneToOrgSlug } from "./phone.js";

export type TrialSignupResult = {
  token: string;
  refreshToken: string;
  user: AuthUser;
  needsSetup: boolean;
};

type TrialUserRecord = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  organizationId: string | null;
  organization?: { id: string; name: string; active: boolean } | null;
};

const createTrialSession = async (
  user: TrialUserRecord,
  needsSetup: boolean,
): Promise<TrialSignupResult> => {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as AuthUser["role"],
    organizationId: user.organizationId ?? undefined,
    organizationName: user.organization?.name,
  };

  const refreshToken = await createRefreshToken(user.id);

  return {
    token: signAccessToken(payload),
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AuthUser["role"],
      organizationId: user.organizationId ?? undefined,
      organizationName: user.organization?.name,
    },
    needsSetup,
  };
};

const signInExistingTrialUser = async (
  existing: TrialUserRecord,
): Promise<TrialSignupResult> => {
  if (!existing.active) {
    throw new TrialOtpError("This account is inactive. Contact support.", 403);
  }
  if (!existing.organizationId || !existing.organization?.active) {
    throw new TrialOtpError("This account is not available. Contact support.", 403);
  }

  const settings = await prisma.shopSettings.findUnique({
    where: { organizationId: existing.organizationId },
    select: { onboardingCompletedAt: true },
  });

  return createTrialSession(existing, settings?.onboardingCompletedAt == null);
};

export const provisionTrialTenant = async (phone: string): Promise<TrialSignupResult> => {
  const email = phoneToLoginEmail(phone);
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { organization: { select: { id: true, name: true, active: true } } },
  });
  if (existing) {
    return signInExistingTrialUser(existing);
  }

  const slugBase = phoneToOrgSlug(phone);
  let slug = slugBase;
  let suffix = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${slugBase}-${suffix}`;
  }

  const password = crypto.randomBytes(12).toString("base64url");
  const hashed = await hashPassword(password);
  const displayPhone = `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;

  const user = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: "My Jewellery Business",
        slug,
        active: true,
      },
    });

    const branch = await tx.branch.create({
      data: {
        organizationId: org.id,
        name: "Main Showroom",
        active: true,
      },
    });

    await tx.shopSettings.create({
      data: {
        organizationId: org.id,
        businessName: "My Jewellery Business",
        phone: displayPhone,
      },
    });

    await tx.storefrontSettings.create({
      data: { organizationId: org.id, enabled: false },
    });

    await createTrialSubscription(org.id, tx);

    const admin = await tx.user.create({
      data: {
        organizationId: org.id,
        email,
        name: "Owner",
        password: hashed,
        role: "Admin",
        active: true,
        defaultBranchId: branch.id,
        branches: { create: { branchId: branch.id } },
      },
      include: { organization: { select: { id: true, name: true, active: true } } },
    });

    return admin;
  });

  return createTrialSession(user, true);
};
