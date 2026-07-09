import { prisma } from "../db.js";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 30;

export const isAccountLocked = (lockedUntil: Date | null): boolean =>
  lockedUntil != null && lockedUntil > new Date();

export const getLockoutMessage = (lockedUntil: Date): string => {
  const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000);
  return `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s) or contact an administrator.`;
};

export const recordFailedLogin = async (userId: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true },
  });
  if (!user) return;

  const attempts = user.failedLoginAttempts + 1;
  const lockedUntil =
    attempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
      : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: attempts,
      lockedUntil,
    },
  });
};

export const resetFailedLoginAttempts = async (userId: string): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
};

export const unlockUserAccount = async (userId: string): Promise<void> => {
  await resetFailedLoginAttempts(userId);
};
