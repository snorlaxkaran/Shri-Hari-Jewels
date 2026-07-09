import { api } from "./client";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
};

export const fetchNotifications = async (): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> => {
  const { data } = await api.get("/api/notifications");
  return data;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await api.post(`/api/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.post("/api/notifications/read-all");
};
