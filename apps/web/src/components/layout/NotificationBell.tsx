"use client";

import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePushNotifications } from "@/lib/push/usePushNotifications";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from "@/lib/api/notificationsApi";

// =============================================================================
// HELPERS
// =============================================================================

function getResourcePath(notification: Notification): string | null {
  if (!notification.resource_type || !notification.resource_id) return null;
  switch (notification.resource_type) {
    case "lead":
      return `/vendedor/leads/${notification.resource_id}`;
    case "appointment":
      return `/vendedor/appointments/${notification.resource_id}`;
    default:
      return null;
  }
}

function timeAgo(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), {
    addSuffix: true,
    locale: es,
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

export function NotificationBell() {
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const push = usePushNotifications();

  const unreadCount = data?.unread_count ?? 0;
  const notifications = data?.items ?? [];

  function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    const path = getResourcePath(notification);
    if (path) {
      router.push(path);
    }
  }

  function handleMarkAllRead() {
    markAllRead.mutate();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ps-error text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            Notificaciones
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-ps-tertiary hover:text-ps-text-primary"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              Marcar todas como leídas
            </Button>
          )}
        </div>

        {push.permission === "default" && (
          <div className="px-2 pb-1.5">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => push.enable()}
              disabled={push.isEnabling}
            >
              Activar notificaciones push
            </Button>
          </div>
        )}

        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="px-4 py-6 text-center text-sm text-ps-tertiary">
            Cargando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-ps-tertiary">
            No tenés notificaciones
          </div>
        ) : (
          <div className="surface-scrollbar max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start gap-0.5 px-3 py-2.5 cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex w-full items-start gap-2">
                  {!notification.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ps-cyan" />
                  )}
                  <div
                    className={notification.is_read ? "pl-4 w-full" : "w-full"}
                  >
                    <p className="text-sm font-medium leading-tight">
                      {notification.title}
                    </p>
                    <p className="text-xs text-ps-tertiary leading-snug mt-0.5">
                      {notification.body}
                    </p>
                    <p className="text-[10px] text-ps-tertiary mt-1">
                      {timeAgo(notification.created_at)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
