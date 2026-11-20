import { prisma } from "../db.js";
import {
  decryptProvisionedPassword,
  encryptProvisionedPassword,
} from "../auth/provisioned-password-crypto.js";
import { hashPassword } from "../auth/password.js";
import { writeAuditLog } from "../audit/service.js";
import type { UserRole } from "../../types.js";
export class ProvisionedCredentialsError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = "ProvisionedCredentialsError";
  }
}

export type ProvisionedPasswordSource =
  | "admin_create"
  | "admin_reset"
  | "platform_create";

export type ProvisionedCredentialSummary = {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
  organizationName?: string;
  setAt: string;
  setByName: string;
  source: string;
};

export const storeAdminProvisionedPassword = async (
  userId: string,
  plainPassword: string,
  actor: { id?: string; name: string },
  source: ProvisionedPasswordSource,
): Promise<void> => {
  const enc = encryptProvisionedPassword(plainPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      provisionedPasswordEnc: enc,
      provisionedPasswordSetAt: new Date(),
      provisionedPasswordSetById: actor.id ?? null,
      provisionedPasswordSetByName: actor.name,
      provisionedPasswordSource: source,
    },
  });
};

export const clearAdminProvisionedPassword = async (userId: string): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      provisionedPasswordEnc: null,
      provisionedPasswordSetAt: null,
      provisionedPasswordSetById: null,
      provisionedPasswordSetByName: null,
      provisionedPasswordSource: null,
    },
  });
};

const canViewTargetUser = (
  viewerRole: UserRole,
  viewerOrganizationId: string | undefined,
  targetOrganizationId: string | null,
): boolean => {
  if (viewerRole === "SuperAdmin") return true;
  if (viewerRole !== "Admin") return false;
  if (!viewerOrganizationId || !targetOrganizationId) return false;
  return viewerOrganizationId === targetOrganizationId;
};

export const revealProvisionedPassword = async (
  viewer: { id: string; role: UserRole; name: string; organizationId?: string },
  targetUserId: string,
): Promise<{ password: string; setAt: string; setByName: string; source: string }> => {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      email: true,
      organizationId: true,
      provisionedPasswordEnc: true,
      provisionedPasswordSetAt: true,
      provisionedPasswordSetByName: true,
      provisionedPasswordSource: true,
    },
  });
  if (!target) throw new ProvisionedCredentialsError("User not found.", 404);
  if (!target.provisionedPasswordEnc || !target.provisionedPasswordSetAt) {
    throw new ProvisionedCredentialsError(
      "No admin-provisioned password on file. User may have set their own password at signup.",
      404,
    );
  }
  if (!canViewTargetUser(viewer.role, viewer.organizationId, target.organizationId)) {
    throw new ProvisionedCredentialsError("You cannot view this user's provisioned password.", 403);
  }

  const password = decryptProvisionedPassword(target.provisionedPasswordEnc);

  await writeAuditLog({
    organizationId: target.organizationId ?? undefined,
    entityType: "User",
    entityId: target.id,
    action: "VIEW_PROVISIONED_PASSWORD",
    after: { email: target.email, viewedById: viewer.id },
    actor: { id: viewer.id, name: viewer.name },
  });

  return {
    password,
    setAt: target.provisionedPasswordSetAt.toISOString(),
    setByName: target.provisionedPasswordSetByName ?? "Unknown",
    source: target.provisionedPasswordSource ?? "unknown",
  };
};

export const listProvisionedCredentials = async (
  viewer: { role: UserRole; organizationId?: string },
): Promise<ProvisionedCredentialSummary[]> => {
  const where =
    viewer.role === "SuperAdmin"
      ? { provisionedPasswordEnc: { not: null } }
      : {
          organizationId: viewer.organizationId ?? "__none__",
          provisionedPasswordEnc: { not: null },
        };

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      provisionedPasswordSetAt: true,
      provisionedPasswordSetByName: true,
      provisionedPasswordSource: true,
      organization: { select: { name: true } },
    },
    orderBy: { provisionedPasswordSetAt: "desc" },
  });

  return users
    .filter((u) => u.provisionedPasswordSetAt)
    .map((u) => ({
      userId: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      organizationId: u.organizationId,
      organizationName: u.organization?.name,
      setAt: u.provisionedPasswordSetAt!.toISOString(),
      setByName: u.provisionedPasswordSetByName ?? "Unknown",
      source: u.provisionedPasswordSource ?? "unknown",
    }));
};

export const resetUserPasswordAsAdmin = async (
  organizationId: string,
  targetUserId: string,
  newPassword: string,
  actor: { id: string; name: string },
): Promise<void> => {
  if (!newPassword || newPassword.length < 6) {
    throw new ProvisionedCredentialsError("Password must be at least 6 characters.");
  }

  const target = await prisma.user.findFirst({
    where: { id: targetUserId, organizationId },
    select: { id: true, email: true, role: true },
  });
  if (!target) throw new ProvisionedCredentialsError("User not found.", 404);
  if (target.role === "SuperAdmin") {
    throw new ProvisionedCredentialsError("Cannot reset this account from company settings.");
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      password: hashed,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await storeAdminProvisionedPassword(targetUserId, newPassword, actor, "admin_reset");

  await writeAuditLog({
    organizationId,
    entityType: "User",
    entityId: targetUserId,
    action: "PASSWORD_RESET_BY_ADMIN",
    after: { email: target.email },
    actor,
  });
};