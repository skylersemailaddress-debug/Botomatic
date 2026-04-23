import { saveNotificationDB } from "../persistence/src/notificationRepo";

export type Notification = {
  notificationId: string;
  channel: "email" | "slack" | "sms";
  recipient: string;
  subject: string;
  body: string;
  createdAt: string;
};

export async function sendNotificationV2(input: Omit<Notification, "notificationId" | "createdAt">) {
  const notification: Notification = {
    notificationId: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };

  // In real system, this is where provider (email/slack) would be called

  await saveNotificationDB({ ...notification, status: "sent" });

  return notification;
}
