import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  Unsubscribe,
  limit,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export type NotificationType =
  | "project_unlocked"
  | "bid_received"
  | "new_bid"
  | "bid_accepted"
  | "bid_rejected"
  | "new_message"
  | "message"
  | "new_review"
  | "verification_approved"
  | "verification_rejected";

export interface AppNotification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
}

/**
 * Create a new notification.
 */
export async function createNotification(
  notification: Omit<AppNotification, "id">
): Promise<string> {
  const docRef = await addDoc(collection(db, "notifications"), notification);
  return docRef.id;
}

/**
 * Subscribe to notifications for a user (real-time).
 */
export function subscribeToNotifications(
  uid: string,
  callback: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "notifications"),
    where("recipientUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications: AppNotification[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as AppNotification));
      callback(notifications);
    },
    (error) => {
      console.error("Error fetching notifications:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, { read: true });
}

/**
 * Mark all unread notifications for a user as read.
 */
export async function markAllNotificationsRead(uid: string): Promise<void> {
  const q = query(
    collection(db, "notifications"),
    where("recipientUid", "==", uid),
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.forEach((doc) => {
    batch.update(doc.ref, { read: true });
  });

  await batch.commit();
}

/**
 * Delete a single notification by document ID.
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  await deleteDoc(doc(db, "notifications", notificationId));
}

/**
 * Delete all notifications for a user.
 */
export async function deleteAllNotifications(uid: string): Promise<void> {
  const batchSize = 400;
  while (true) {
    const q = query(
      collection(db, "notifications"),
      where("recipientUid", "==", uid),
      limit(batchSize)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) break;
    const batch = writeBatch(db);
    snapshot.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/**
 * Get unread notification count for a user (with real-time updates).
 */
export function getUnreadCount(
  uid: string,
  callback: (count: number) => void
): Unsubscribe {
  const q = query(
    collection(db, "notifications"),
    where("recipientUid", "==", uid),
    where("read", "==", false)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.size);
    },
    (error) => {
      console.error("Error fetching unread count:", error);
    }
  );
}
