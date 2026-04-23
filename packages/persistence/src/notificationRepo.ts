import { pool } from "./dbClient";
import { Notification } from "../../modules/notifications";

export async function saveNotificationDB(notification: Notification & { status?: string }) {
  await pool.query(
    `INSERT INTO notifications (notification_id, channel, recipient, subject, body, created_at, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (notification_id)
     DO UPDATE SET channel = EXCLUDED.channel, recipient = EXCLUDED.recipient, subject = EXCLUDED.subject, body = EXCLUDED.body, created_at = EXCLUDED.created_at, status = EXCLUDED.status`,
    [
      notification.notificationId,
      notification.channel,
      notification.recipient,
      notification.subject,
      notification.body,
      notification.createdAt,
      notification.status || "sent",
    ]
  );
}

export async function getNotificationsDB(recipient?: string): Promise<(Notification & { status?: string })[]> {
  const res = recipient
    ? await pool.query(`SELECT * FROM notifications WHERE recipient = $1 ORDER BY created_at ASC`, [recipient])
    : await pool.query(`SELECT * FROM notifications ORDER BY created_at ASC`);

  return res.rows.map((r) => ({
    notificationId: r.notification_id,
    channel: r.channel,
    recipient: r.recipient,
    subject: r.subject,
    body: r.body,
    createdAt: r.created_at,
    status: r.status,
  }));
}
