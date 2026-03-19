"use client";

import { useEffect, useState, useRef } from "react";
import { HiBell } from "react-icons/hi";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToNotifications,
  markAllNotificationsRead,
  AppNotification,
} from "@/lib/notifications";
import { formatRelativeTime } from "@/lib/utils";

function getNotificationLink(notif: AppNotification, role: string): string {
  switch (notif.type) {
    case "project_unlocked":
      return "/dashboard/homeowner/projects";
    case "bid_received":
    case "new_bid":
      return "/dashboard/homeowner/bids";
    case "bid_accepted":
    case "bid_rejected":
      return "/dashboard/contractor/bids";
    case "new_message":
    case "message":
      return `/dashboard/${role}/messages`;
    case "new_review":
      return "/dashboard/contractor/analytics";
    default:
      return "#";
  }
}

export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const { firebaseUser, userProfile } = useAuth();
  const role = userProfile?.role ?? "homeowner";
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = subscribeToNotifications(
      firebaseUser.uid,
      setNotifications,
      (error) => console.error("Notifications error:", error)
    );
    return unsub;
  }, [firebaseUser]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    if (!firebaseUser) return;
    try {
      await markAllNotificationsRead(firebaseUser.uid);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    /* relative so the dropdown is absolutely positioned relative to this wrapper */
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-gray-600 hover:text-orange-600 transition"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <HiBell className="text-2xl" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full pointer-events-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          className={`absolute top-full mt-1.5 w-80 max-h-[min(384px,80vh)] bg-white border border-gray-200 rounded-lg shadow-2xl flex flex-col overflow-hidden z-50 ${align === "left" ? "left-0" : "right-0"}`}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold text-gray-900 text-sm">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
                <HiBell className="text-3xl opacity-40" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notif) => (
                  <a
                    key={notif.id}
                    href={getNotificationLink(notif, role)}
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-3 hover:bg-gray-50 transition-colors ${
                      !notif.read ? "bg-orange-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread dot */}
                      <div
                        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          !notif.read ? "bg-orange-500" : "bg-transparent"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {formatRelativeTime(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Footer — view all */}
          <div className="px-4 py-2.5 border-t border-gray-100 text-center flex-shrink-0">
            <a
              href={`/dashboard/${role}/notifications`}
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-orange-600 hover:text-orange-700"
            >
              View all notifications →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
