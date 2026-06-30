import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Bell, CheckCheck, X } from "lucide-react";
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type Notification,
} from "../../services/notificationService";

const formatNotificationTime = (value?: number) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function NotificationBell({
  userId,
  className = "",
  compact = false,
}: {
  userId?: string;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToNotifications(userId, setNotifications);
    return () => {
      unsubscribe();
    };
  }, [userId]);

  // Position the panel whenever it opens
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const panelHeight = 420;
    const spaceBelow = window.innerHeight - rect.top;
    const top =
      spaceBelow >= panelHeight
        ? rect.top
        : Math.max(8, rect.bottom - panelHeight);
    setPanelStyle({
      position: "fixed",
      top,
      left: rect.right + 12,
      zIndex: 9999,
      width: 320,
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  if (!userId) return null;

  const buttonSize = compact ? "size-10 min-w-10" : "h-9 w-9";

  const panel = open
    ? ReactDOM.createPortal(
        <div
          ref={panelRef}
          style={panelStyle}
          className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2.5">
            <div>
              <div className="text-[11px] font-['Lexend:SemiBold',_sans-serif] uppercase tracking-[0.12em] text-neutral-400">
                Notifications
              </div>
              <div className="text-[11px] text-neutral-500">
                {unreadCount} unread
              </div>
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  onClick={() => markAllNotificationsRead(userId)}
                  className="flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
                  title="Mark all read"
                >
                  <CheckCheck size={12} />
                  Read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                title="Close"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-neutral-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => {
                const time = formatNotificationTime(notification.createdAt);
                return (
                  <button
                    key={notification.id}
                    onClick={() =>
                      !notification.read &&
                      markNotificationRead(userId, notification.id)
                    }
                    className={`block w-full border-b border-neutral-100 px-3 py-3 text-left transition last:border-0 hover:bg-neutral-50 ${
                      notification.read ? "bg-white" : "bg-blue-50/60"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          notification.read ? "bg-neutral-200" : "bg-blue-500"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                          {notification.title || "Notification"}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-neutral-600">
                          {notification.message}
                        </span>
                        {notification.reason && (
                          <span className="mt-1 block rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
                            Reason: {notification.reason}
                          </span>
                        )}
                        {time && (
                          <span className="mt-1 block text-[10px] text-neutral-400">
                            {time}
                          </span>
                        )}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          ref={buttonRef}
          onClick={() => setOpen((value) => !value)}
          className={`relative flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900 ${buttonSize}`}
          title={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "No new notifications"
          }
        >
          <Bell size={compact ? 16 : 15} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
      {panel}
    </>
  );
}
