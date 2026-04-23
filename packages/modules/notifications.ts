export type NotificationChannel = "email" | "slack" | "in_app";

export type Notification = {
  notificationId: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  body: string;
  createdAt: string;
};

const notificationLog: Notification[] = [];

export function sendNotification(input: Omit<Notification, "notificationId" | "createdAt">) {
  const notification: Notification = {
    notificationId: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };

  notificationLog.push(notification);
  return notification;
}

export function getNotifications(): Notification[] {
  return notificationLog;
}
