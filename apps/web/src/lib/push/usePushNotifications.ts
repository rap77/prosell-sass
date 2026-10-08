"use client";

/**
 * usePushNotifications — Web Push opt-in flow.
 * CRM roadmap Fase 5 delivery channel.
 */

import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";
import { useSubscribeToPush, VAPID_PUBLIC_KEY_SCHEMA } from "@/lib/api/push";

export type PushPermissionState =
  "unsupported" | "default" | "granted" | "denied";

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Notification !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator
  );
}

// `Notification.permission` has no native change event (unlike
// matchMedia's in useIsMobile.ts) — the only thing that ever changes it
// is our own enable() calling requestPermission(), so we notify our own
// listeners manually right after that resolves instead of subscribing to
// anything external.
const permissionListeners = new Set<() => void>();

function subscribeToPermission(onChange: () => void) {
  permissionListeners.add(onChange);
  return () => permissionListeners.delete(onChange);
}

function notifyPermissionChanged() {
  for (const listener of permissionListeners) listener();
}

function toPushPermissionState(
  value: NotificationPermission,
): PushPermissionState {
  switch (value) {
    case "granted":
    case "denied":
    case "default":
      return value;
    default:
      return "unsupported";
  }
}

function getPermissionSnapshot(): PushPermissionState {
  return isPushSupported()
    ? toPushPermissionState(Notification.permission)
    : "unsupported";
}

function getServerPermissionSnapshot(): PushPermissionState {
  return "unsupported";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const permission = useSyncExternalStore(
    subscribeToPermission,
    getPermissionSnapshot,
    getServerPermissionSnapshot,
  );
  const subscribeMutation = useSubscribeToPush();

  async function enable() {
    if (!isPushSupported()) return;

    try {
      const result = await Notification.requestPermission();
      notifyPermissionChanged();
      if (result !== "granted") return;

      const keyRes = await fetchWithAuth("/api/v1/push/vapid-public-key");
      if (!keyRes.ok) {
        toast.error("No se pudo activar las notificaciones push");
        return;
      }
      const { public_key: publicKey } = VAPID_PUBLIC_KEY_SCHEMA.parse(
        await keyRes.json(),
      );

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        toast.error("No se pudo activar las notificaciones push");
        return;
      }

      await subscribeMutation.mutateAsync({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo activar las notificaciones push",
      );
    }
  }

  return { permission, enable, isEnabling: subscribeMutation.isPending };
}
