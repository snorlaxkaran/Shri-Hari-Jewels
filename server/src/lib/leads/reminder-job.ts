import { prisma } from "../db.js";
import { createNotification } from "../notifications/service.js";

let reminderJobRunning = false;

export const runLeadReminders = async (): Promise<{ notified: number }> => {
  if (reminderJobRunning) return { notified: 0 };
  reminderJobRunning = true;

  try {
    const now = new Date();
    const withinHour = new Date(now.getTime() + 60 * 60 * 1000);
    let notified = 0;

    const appointments = await prisma.appointment.findMany({
      where: {
        reminderSent: false,
        completed: false,
        scheduledAt: { gte: now, lte: withinHour },
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            assignedToId: true,
            assignedToName: true,
            organizationId: true,
          },
        },
      },
    });

    for (const appt of appointments) {
      const assigneeId = appt.lead.assignedToId;
      const message = `Appointment "${appt.title}" with ${appt.lead.name} at ${appt.scheduledAt.toLocaleString("en-IN")}`;

      if (assigneeId) {
        await createNotification({
          userId: assigneeId,
          organizationId: appt.lead.organizationId,
          type: "lead_appointment",
          title: "Upcoming appointment",
          message,
          link: `/leads/${appt.lead.id}`,
        });
      }

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSent: true },
      });
      notified += 1;
    }

    const followUps = await prisma.followUp.findMany({
      where: {
        completedAt: null,
        dueAt: { gte: now, lte: withinHour },
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            assignedToId: true,
            organizationId: true,
          },
        },
      },
    });

    for (const fu of followUps) {
      const assigneeId = fu.lead.assignedToId;
      const message = `Follow-up due for ${fu.lead.name}${fu.note ? `: ${fu.note}` : ""}`;

      if (assigneeId) {
        await createNotification({
          userId: assigneeId,
          organizationId: fu.lead.organizationId,
          type: "lead_follow_up",
          title: "Follow-up due soon",
          message,
          link: `/leads/${fu.lead.id}`,
        });
      }
      notified += 1;
    }

    return { notified };
  } finally {
    reminderJobRunning = false;
  }
};

export const startLeadReminderJob = (): void => {
  const cronExpr = process.env.LEAD_REMINDER_CRON ?? "*/15 * * * *";
  void import("node-cron").then(({ default: cron }) => {
    cron.schedule(cronExpr, async () => {
      try {
        const result = await runLeadReminders();
        if (result.notified > 0) {
          console.log(`[lead-reminders] Sent ${result.notified} reminder(s)`);
        }
      } catch (error) {
        console.error("[lead-reminders] Job failed:", error);
      }
    });
    console.log(`[jobs] Lead reminders (${cronExpr})`);
  });
};
