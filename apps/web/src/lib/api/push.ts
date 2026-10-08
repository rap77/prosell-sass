"use client";

/**
 * Push subscription API client.
 * CRM roadmap Fase 5 delivery channel.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";

// =============================================================================
// SCHEMAS
// =============================================================================

export const VAPID_PUBLIC_KEY_SCHEMA = z.object({ public_key: z.string() });

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// =============================================================================
// QUERY KEYS
// =============================================================================

export const VAPID_PUBLIC_KEY_QUERY_KEY = ["push", "vapid-public-key"] as const;

// =============================================================================
// HOOKS
// =============================================================================

export function useVapidPublicKey() {
  return useQuery({
    queryKey: VAPID_PUBLIC_KEY_QUERY_KEY,
    queryFn: async () => {
      const res = await fetchWithAuth("/api/v1/push/vapid-public-key");
      if (!res.ok) {
        throw new Error("Failed to fetch VAPID public key");
      }
      return VAPID_PUBLIC_KEY_SCHEMA.parse(await res.json());
    },
  });
}

export function useSubscribeToPush() {
  return useMutation({
    mutationFn: async (subscription: PushSubscriptionPayload) => {
      const res = await fetchWithAuth("/api/v1/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!res.ok) {
        throw new Error("Failed to register push subscription");
      }
    },
  });
}

export function useUnsubscribeFromPush() {
  return useMutation({
    mutationFn: async (endpoint: string) => {
      const res = await fetchWithAuth("/api/v1/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      if (!res.ok) {
        throw new Error("Failed to remove push subscription");
      }
    },
  });
}
