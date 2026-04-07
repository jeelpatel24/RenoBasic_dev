"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, deleteAllNotifications, AppNotification } from "@/lib/notifications";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import {
  HiBell,
  HiArrowLeft,
  HiCheck,
  HiCheckCircle,
  HiXCircle,
  HiChat,
  HiStar,
  HiTrash,
  HiShieldCheck,
  HiShieldExclamation,
} from "react-icons/hi";

export default function NotificationsPage() {
  const { firebaseUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;

    const unsubscribe = subscribeToNotifications(
      firebaseUser.uid,
      (notifs) => {
        setNotifications(notifs);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching notifications:", err);
        setError("Failed to load notifications.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [firebaseUser]);

  const handleMarkRead = async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    if (!firebaseUser) return;
    try {
      await markAllNotificationsRead(firebaseUser.uid);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleClearAll = async () => {
    if (!firebaseUser) return;
    if (!confirm("Delete all notifications? This cannot be undone.")) return;
    try {
      await deleteAllNotifications(firebaseUser.uid);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };


  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "project_unlocked":
        return <HiBell className="text-blue-500" />;
      case "bid_received":
      case "new_bid":
        return <HiCheckCircle className="text-green-500" />;
      case "bid_accepted":
        return <HiCheck className="text-green-600" />;
      case "bid_rejected":
        return <HiXCircle className="text-red-500" />;
      case "new_message":
      case "message":
        return <HiChat className="text-orange-500" />;
      case "new_review":
        return <HiStar className="text-amber-500" />;
      case "verification_approved":
        return <HiShieldCheck className="text-green-500" />;
      case "verification_rejected":
        return <HiShieldExclamation className="text-red-500" />;
      default:
        return <HiBell className="text-gray-500" />;
    }
  };

  const getNotificationLink = (notif: AppNotification) => {
    switch (notif.type) {
      case "project_unlocked":
        return "/dashboard/homeowner/projects";
      case "bid_received":
      case "new_bid":
      case "bid_accepted":
      case "bid_rejected":
        return "/dashboard/homeowner/bids";
      case "new_message":
      case "message":
        return "/dashboard/homeowner/messages";
      case "new_review":
        return "/dashboard/homeowner/bids";
      case "verification_approved":
      case "verification_rejected":
        return "/dashboard/homeowner/settings";
      default:
        return "#";
    }
  };

  return (
    <ProtectedRoute allowedRoles={["homeowner"]}>
      <DashboardLayout role="homeowner">
        <div className="space-y-6 max-w-3xl">
          {/* Page Header */}
          <div>
            <Link
              href="/dashboard/homeowner"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors text-sm mb-4"
            >
              <HiArrowLeft size={16} /> Back to Dashboard
            </Link>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-500 mt-1">
                  Stay updated on your projects, bids, and messages.
                </p>
              </div>
              {notifications.length > 0 && (
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleMarkAllRead}
                    className="text-sm px-3 py-1.5 rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 transition"
                  >
                    Mark all read
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="text-sm px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition flex items-center gap-1"
                  >
                    <HiTrash size={14} /> Clear all
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-center py-12 text-gray-400">
                <HiBell size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium text-gray-700">{error}</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-center py-12 text-gray-400">
                <HiBell size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">No notifications</p>
                <p className="text-sm mt-1">
                  You&apos;re all caught up! Check back soon for updates.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <a
                  key={notif.id}
                  href={getNotificationLink(notif)}
                  onClick={() => { if (!notif.read) handleMarkRead(notif.id); }}
                  className={`block rounded-xl border transition-all duration-200 ${
                    notif.read
                      ? "bg-white border-gray-200 hover:border-orange-200 hover:shadow-sm"
                      : "bg-orange-50 border-orange-200 hover:border-orange-300 hover:shadow-md"
                  }`}
                >
                  <div className="p-4 flex items-start gap-4">
                    <div className="flex-shrink-0 p-2.5 bg-white rounded-lg border border-gray-200">
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className="font-semibold text-gray-900">
                          {notif.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!notif.read && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleMarkRead(notif.id);
                              }}
                              className="text-xs px-2.5 py-1 rounded-full bg-orange-600 text-white hover:bg-orange-700 transition whitespace-nowrap"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(e, notif.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition"
                            title="Delete notification"
                          >
                            <HiTrash size={15} />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2">
                        {notif.message}
                      </p>

                      <p className="text-xs text-gray-500 mt-2">
                        {formatDate(notif.createdAt)}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
