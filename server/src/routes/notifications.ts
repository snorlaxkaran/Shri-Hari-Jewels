import { Router } from "express";
import {
  getUnreadNotificationCount,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/notifications/service.js";
import {
  authenticate,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { routeParam } from "../lib/route-param.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const notifications = await listUserNotifications(req.user!.id, unreadOnly);
    const unreadCount = await getUnreadNotificationCount(req.user!.id);
    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("GET /api/notifications", error);
    res.status(500).json({ error: "Failed to fetch notifications." });
  }
});

notificationsRouter.post(
  "/:id/read",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      await markNotificationRead(req.user!.id, routeParam(req.params.id));
      res.json({ ok: true });
    } catch (error) {
      console.error("POST /api/notifications/:id/read", error);
      res.status(500).json({ error: "Failed to mark notification read." });
    }
  },
);

notificationsRouter.post(
  "/read-all",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      await markAllNotificationsRead(req.user!.id);
      res.json({ ok: true });
    } catch (error) {
      console.error("POST /api/notifications/read-all", error);
      res.status(500).json({ error: "Failed to mark notifications read." });
    }
  },
);
