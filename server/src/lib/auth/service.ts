import { prisma } from "../db.js";
import type { AuthUser, LoginInput } from "../../types.js";
import { isAuthenticatedRole } from "./permissions.js";
import {
  signAccessToken,
  signTemp2faToken,
  verifyTemp2faToken,
} from "./jwt.js";
import {
  createRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
} from "./refresh-token.js";
import { verifyPassword } from "./password.js";
import {
  getLockoutMessage,
  isAccountLocked,
  recordFailedLogin,
  resetFailedLoginAttempts,
  unlockUserAccount,
} from "./lockout.js";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  getTotpUri,
  verifyTotpCode,
} from "./totp.js";
import { writeAuditLog } from "../audit/service.js";
import { logBusinessEvent } from "../logger.js";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const ADMIN_ROLES = new Set(["Admin", "SuperAdmin"]);

const resolveLoginEmail = (identifier: string): string => {
  if (identifier.includes("@")) return identifier;
  return `${identifier}@shreehari.com`;
};

const toAuthUser = (user: {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
  organization?: { name: string } | null;
  totpEnabled?: boolean;
}): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role as AuthUser["role"],
  organizationId: user.organizationId ?? undefined,
  organizationName: user.organization?.name,
  totpEnabled: user.totpEnabled ?? false,
});

const buildTokenPayload = (user: {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
  organization?: { name: string } | null;
}) => ({
  sub: user.id,
  email: user.email,
  name: user.name,
  role: user.role as AuthUser["role"],
  organizationId: user.organizationId ?? undefined,
  organizationName: user.organization?.name,
});

export type LoginResult =
  | {
      requires2FA: true;
      tempToken: string;
      user: AuthUser;
    }
  | {
      token: string;
      refreshToken: string;
      user: AuthUser;
    };

export const login = async (input: LoginInput): Promise<LoginResult> => {
  const identifier = input.email.trim().toLowerCase();
  const password = input.password;

  if (!identifier || !password) {
    throw new AuthError("User ID and password are required.");
  }

  const email = resolveLoginEmail(identifier);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: { select: { id: true, name: true, active: true } } },
  });

  if (!user || !user.active) {
    throw new AuthError("Invalid email or password.");
  }

  if (isAccountLocked(user.lockedUntil)) {
    throw new AuthError(getLockoutMessage(user.lockedUntil!), 423);
  }

  if (user.organization && !user.organization.active) {
    throw new AuthError("Your company account has been deactivated.");
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    await recordFailedLogin(user.id);
    throw new AuthError("Invalid email or password.");
  }

  if (!isAuthenticatedRole(user.role)) {
    throw new AuthError("User role is not configured.");
  }

  await resetFailedLoginAttempts(user.id);
  logBusinessEvent("user.login", { userId: user.id, email: user.email });

  const authUser = toAuthUser(user);

  if (user.totpEnabled && user.totpSecret) {
    return {
      requires2FA: true,
      tempToken: signTemp2faToken(buildTokenPayload(user)),
      user: authUser,
    };
  }

  if (ADMIN_ROLES.has(user.role) && !user.totpEnabled) {
    // Allow login but flag that 2FA setup is recommended
    logBusinessEvent("user.login_without_2fa", { userId: user.id, role: user.role });
  }

  const refreshToken = await createRefreshToken(user.id);
  return {
    token: signAccessToken(buildTokenPayload(user)),
    refreshToken,
    user: authUser,
  };
};

export const verify2faLogin = async (
  tempToken: string,
  code: string,
): Promise<{ token: string; refreshToken: string; user: AuthUser }> => {
  const payload = verifyTemp2faToken(tempToken);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { organization: { select: { id: true, name: true, active: true } } },
  });

  if (!user || !user.active || !user.totpEnabled || !user.totpSecret) {
    throw new AuthError("Invalid 2FA session.");
  }

  const secret = decryptTotpSecret(user.totpSecret);
  if (!(await verifyTotpCode(secret, code))) {
    throw new AuthError("Invalid authentication code.");
  }

  const refreshToken = await createRefreshToken(user.id);
  return {
    token: signAccessToken(buildTokenPayload(user)),
    refreshToken,
    user: toAuthUser(user),
  };
};

export const refreshAccessToken = async (
  refreshToken: string,
): Promise<{ token: string; refreshToken: string; user: AuthUser }> => {
  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) {
    throw new AuthError("Invalid or expired refresh token.");
  }

  const user = await prisma.user.findUnique({
    where: { id: rotated.userId },
    include: { organization: { select: { id: true, name: true, active: true } } },
  });

  if (!user || !user.active || !isAuthenticatedRole(user.role)) {
    throw new AuthError("User not found.");
  }

  return {
    token: signAccessToken(buildTokenPayload(user)),
    refreshToken: rotated.refreshToken,
    user: toAuthUser(user),
  };
};

export const logout = async (refreshToken?: string): Promise<void> => {
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
};

export const setupTotp = async (
  userId: string,
): Promise<{ secret: string; uri: string }> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AuthError("User not found.", 404);

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: encryptTotpSecret(secret), totpEnabled: false },
  });

  return { secret, uri: getTotpUri(user.email, secret) };
};

export const confirmTotpSetup = async (
  userId: string,
  code: string,
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret) {
    throw new AuthError("2FA setup not started.", 400);
  }

  const secret = decryptTotpSecret(user.totpSecret);
  if (!(await verifyTotpCode(secret, code))) {
    throw new AuthError("Invalid authentication code.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: true },
  });

  await writeAuditLog({
    organizationId: user.organizationId ?? undefined,
    entityType: "User",
    entityId: userId,
    action: "2FA_ENABLED",
    actor: { id: userId, name: user.name },
  });
};

export const disableTotp = async (
  userId: string,
  code: string,
  actor: { id: string; name: string },
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpEnabled || !user.totpSecret) {
    throw new AuthError("2FA is not enabled.", 400);
  }

  const secret = decryptTotpSecret(user.totpSecret);
  if (!(await verifyTotpCode(secret, code))) {
    throw new AuthError("Invalid authentication code.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: false, totpSecret: null },
  });
  await revokeAllUserRefreshTokens(userId);

  await writeAuditLog({
    organizationId: user.organizationId ?? undefined,
    entityType: "User",
    entityId: userId,
    action: "2FA_DISABLED",
    actor,
  });
};

export const adminResetTotp = async (
  targetUserId: string,
  actor: { id: string; name: string; organizationId?: string },
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new AuthError("User not found.", 404);

  await prisma.user.update({
    where: { id: targetUserId },
    data: { totpEnabled: false, totpSecret: null },
  });
  await revokeAllUserRefreshTokens(targetUserId);
  await unlockUserAccount(targetUserId);

  await writeAuditLog({
    organizationId: actor.organizationId ?? user.organizationId ?? undefined,
    entityType: "User",
    entityId: targetUserId,
    action: "2FA_ADMIN_RESET",
    actor,
  });
};

export const getUserById = async (id: string): Promise<AuthUser | null> => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { organization: { select: { id: true, name: true, active: true } } },
  });
  if (!user || !user.active || !isAuthenticatedRole(user.role)) return null;
  if (user.organization && !user.organization.active) return null;

  return toAuthUser(user);
};
