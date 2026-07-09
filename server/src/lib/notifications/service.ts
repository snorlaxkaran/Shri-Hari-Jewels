import { prisma } from "../db.js";

export type CreateNotificationInput = {
  userId: string;
  organizationId?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
};

export const createNotification = async (
  input: CreateNotificationInput,
) => {
  return prisma.notification.create({ data: input });
};

export const createNotificationForAdmins = async (
  organizationId: string,
  input: Omit<CreateNotificationInput, "userId" | "organizationId">,
): Promise<void> => {
  const admins = await prisma.user.findMany({
    where: {
      organizationId,
      active: true,
      role: { in: ["Admin", "SuperAdmin", "SalesManager"] },
    },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      organizationId,
      ...input,
    })),
  });
};

export const listUserNotifications = async (
  userId: string,
  unreadOnly = false,
) => {
  const rows = await prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link ?? undefined,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));
};

export const markNotificationRead = async (
  userId: string,
  notificationId: string,
): Promise<void> => {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> =>
  prisma.notification.count({ where: { userId, read: false } });
