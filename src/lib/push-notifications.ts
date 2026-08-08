"use client";

import { playNotificationTone } from "@/components/NotificationBell";

export interface DesktopNotificationParams {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  playSound?: boolean;
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermissionStatus(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  
  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return false;
  }
}

export function sendDesktopNotification({
  title,
  body,
  url = "/",
  icon = "/favicon.ico",
  playSound = true
}: DesktopNotificationParams) {
  if (!isNotificationSupported()) return;

  if (playSound) {
    playNotificationTone();
  }

  if (Notification.permission === "granted") {
    try {
      const notif = new Notification(title, {
        body,
        icon,
        badge: icon,
        silent: true, // We play custom Web Audio API chime above
        data: { url }
      });

      notif.onclick = function (event) {
        event.preventDefault();
        window.focus();
        if (url) {
          window.location.href = url;
        }
        notif.close();
      };
    } catch (err) {
      console.error("Failed to trigger desktop notification:", err);
    }
  }
}
