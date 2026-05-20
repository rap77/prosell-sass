"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

// =============================================================================
// SCHEMAS
// =============================================================================

const NOTIFICATION_SCHEMA = z.object({
  id: z.string().uuid(),
  notification_type: z.string(),
  title: z.string(),
  body: z.string(),
  resource_type: z.string().nullable(),
  resource_id: z.string().uuid().nullable(),
  is_read: z.boolean(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

const NOTIFICATION_LIST_SCHEMA = z.object({
  items: z.array(NOTIFICATION_SCHEMA),
  unread_count: z.number(),
});

export type Notification = z.infer<typeof NOTIFICATION_SCHEMA>;
export type NotificationList = z.infer<typeof NOTIFICATION_LIST_SCHEMA>;

// =============================================================================
// QUERY KEYS
// =============================================================================

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

// =============================================================================
// HOOKS
// =============================================================================

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: async (): Promise<NotificationList> => {
      const response = await fetch("/api/v1/notifications", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      const data: unknown = await response.json();
      return NOTIFICATION_LIST_SCHEMA.parse(data);
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 20_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string): Promise<Notification> => {
      const response = await fetch(
        `/api/v1/notifications/${notificationId}/read`,
        {
          method: "PUT",
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
      const data: unknown = await response.json();
      return NOTIFICATION_SCHEMA.parse(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await fetch("/api/v1/notifications/read-all", {
        method: "PUT",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
