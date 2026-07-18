import webpush from "web-push";
import { db } from "@/lib/db";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@staffops.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function sendPushNotification(userId: string, title: string, body: string, data: any = {}) {
  try {
    const subscriptions = await db.pushsubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title,
      body,
      data
    });

    const sendPromises = subscriptions.map(sub => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      return webpush.sendNotification(pushSubscription, payload).catch(async (err) => {
        // Remove expired/invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.pushsubscription.delete({
            where: { endpoint: sub.endpoint }
          }).catch(() => {});
        } else {
          console.error("WebPush send error for endpoint:", sub.endpoint, err);
        }
      });
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error("sendPushNotification helper error:", error);
  }
}
