import { prisma } from "../db.js";
import { hashPassword } from "../auth/password.js";
import { signAccessToken } from "../auth/jwt.js";
import { createRefreshToken } from "../auth/refresh-token.js";
import { createTrialSubscription } from "../subscriptions/service.js";
import type { AuthUser } from "../../types.js";
import {
  normalizeIndianPhone,
  phoneToLoginEmail,
  phoneToOrgSlug,
  hasConfiguredLogin,
  resolveLoginEmail,
} from "./phone.js";

export class TrialSignupError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "TrialSignupError";
  }
}

export type TrialSignupResult = {
  token: string;
  refreshToken: string;
  user: AuthUser;
  needsSetup: boolean;
};

const createTrialSession = async (
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string | null;
    organization?: { id: string; name: string; active: boolean } | null;
  },
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

const validateUserId = (raw: string): string => {
  const userId = raw.trim().toLowerCase();
  if (!userId) {
    throw new TrialSignupError("User ID is required.");
  }
  if (userId.includes("@")) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userId)) {
      throw new TrialSignupError("Enter a valid login email.");
    }
    return userId;
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(userId)) {
    throw new TrialSignupError(
      "User ID must be 3–32 characters: letters, numbers, dots, hyphens, or underscores.",
    );
  }
  return userId;
};

const validatePassword = (password: string): void => {
  if (!password || password.length < 6) {
    throw new TrialSignupError("Password must be at least 6 characters.");
  }
};

const needsSetupForUser = async (organizationId: string): Promise<boolean> => {
  const settings = await prisma.shopSettings.findUnique({
    where: { organizationId },
    select: { onboardingCompletedAt: true },
  });
  return settings?.onboardingCompletedAt == null;
};

const resumeIncompleteTrial = async (
  existing: {
    id: string;
    email: string;
    name: string;
    role: string;
    active: boolean;
    credentialsConfigured: boolean;
    organizationId: string | null;
    organization: { id: string; name: string; active: boolean } | null;
  },
  loginEmail: string,
  hashedPassword: string,
  displayName: string,
): Promise<TrialSignupResult> => {
  if (hasConfiguredLogin(existing)) {
    throw new TrialSignupError(
      "This mobile number is already registered. Sign in with your user ID and password.",
      409,
    );
  }
  if (!existing.active || !existing.organizationId || !existing.organization?.active) {
    throw new TrialSignupError("This account is not available. Contact +91 9971692727.", 403);
  }

  const emailTaken = await prisma.user.findUnique({ where: { email: loginEmail } });
  if (emailTaken && emailTaken.id !== existing.id) {
    throw new TrialSignupError("This user ID or email is already in use.", 409);
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      email: loginEmail,
      name: displayName,
      password: hashedPassword,
      credentialsConfigured: true,
    },
    include: { organization: { select: { id: true, name: true, active: true } } },
  });

  const needsSetup = await needsSetupForUser(updated.organizationId!);
  return createTrialSession(updated, needsSetup);
};

export type RegisterTrialInput = {
  phone: string;
  userId: string;
  password: string;
  name?: string;
};

export const registerTrialTenant = async (input: RegisterTrialInput): Promise<TrialSignupResult> => {
  const phone = normalizeIndianPhone(input.phone);
  if (!phone) {
    throw new TrialSignupError("Enter a valid 10-digit mobile number.");
  }

  const userId = validateUserId(input.userId);
  validatePassword(input.password);
  const loginEmail = resolveLoginEmail(userId);
  const displayName = input.name?.trim() || "Owner";
  const hashed = await hashPassword(input.password);

  const byPhone = await prisma.user.findFirst({
    where: { OR: [{ phone }, { email: phoneToLoginEmail(phone) }] },
    include: { organization: { select: { id: true, name: true, active: true } } },
  });

  if (byPhone) {
    return resumeIncompleteTrial(byPhone, loginEmail, hashed, displayName);
  }

  const emailTaken = await prisma.user.findUnique({ where: { email: loginEmail } });
  if (emailTaken) {
    throw new TrialSignupError("This user ID or email is already in use.", 409);
  }

  const slugBase = phoneToOrgSlug(phone);
  let slug = slugBase;
  let suffix = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${slugBase}-${suffix}`;
  }

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
        email: loginEmail,
        phone,
        name: displayName,
        password: hashed,
        role: "Admin",
        active: true,
        credentialsConfigured: true,
        defaultBranchId: branch.id,
        branches: { create: { branchId: branch.id } },
      },
      include: { organization: { select: { id: true, name: true, active: true } } },
    });

    return admin;
  });

  return createTrialSession(user, true);
};
