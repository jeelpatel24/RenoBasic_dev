import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  increment,
  writeBatch,
} from "firebase/firestore";
import { Conversation, Message } from "@/types";

/**
 * Conversation ID format: {contractorUid}_{projectId}
 */
function getConversationId(contractorUid: string, projectId: string): string {
  return `${contractorUid}_${projectId}`;
}

/**
 * Get or create a conversation between a contractor and homeowner for a project.
 */
export async function getOrCreateConversation(
  contractorUid: string,
  projectId: string,
  homeownerUid: string,
  homeownerName: string,
  contractorName: string,
  projectCategory: string
): Promise<string> {
  const conversationId = getConversationId(contractorUid, projectId);
  const conversationRef = doc(db, "conversations", conversationId);
  const now = new Date().toISOString();

  const conversation: Conversation = {
    id: conversationId,
    homeownerUid,
    contractorUid,
    projectId,
    homeownerName,
    contractorName,
    projectCategory,
    lastMessage: "",
    lastMessageTimestamp: now,
    messageCount: 0,
    createdAt: now,
  };

  await setDoc(conversationRef, conversation, { merge: true });
  return conversationId;
}

/**
 * Send a message in a conversation.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  content: string
): Promise<void> {
  const now = new Date().toISOString();

  const message: Omit<Message, "id"> = {
    senderId,
    senderName,
    content,
    timestamp: now,
    read: false,
  };

  const messagesCollectionRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );
  await addDoc(messagesCollectionRef, message);

  // Update conversation metadata
  const conversationRef = doc(db, "conversations", conversationId);
  await updateDoc(conversationRef, {
    lastMessage:
      content.length > 80 ? content.substring(0, 80) + "..." : content,
    lastMessageTimestamp: now,
    messageCount: increment(1),
  });
}

/**
 * Mark all messages not from currentUser as read.
 */
export async function markMessagesAsRead(
  conversationId: string,
  currentUserId: string
): Promise<void> {
  const messagesCollectionRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );
  const q = query(
    messagesCollectionRef,
    where("senderId", "!=", currentUserId),
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
 * Delete a conversation and all its messages.
 * Messages are deleted in batches of 400 to stay well under the 500-op Firestore limit.
 * The conversation document is deleted last.
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const messagesRef = collection(db, "conversations", conversationId, "messages");

  // Delete all messages in batches (loop until none left)
  let hasMore = true;
  while (hasMore) {
    const snap = await getDocs(query(messagesRef, limit(400)));
    if (snap.empty) {
      hasMore = false;
      break;
    }
    const batch = writeBatch(db);
    snap.forEach((msgDoc) => batch.delete(msgDoc.ref));
    await batch.commit();
    // If fewer than 400 were returned, there are no more
    if (snap.size < 400) hasMore = false;
  }

  // Delete the conversation document itself
  await deleteDoc(doc(db, "conversations", conversationId));
}

/**
 * Subscribe to conversations for a user (real-time).
 */
export function subscribeToConversations(
  userId: string,
  role: "homeowner" | "contractor",
  callback: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const matchField = role === "homeowner" ? "homeownerUid" : "contractorUid";
  const q = query(
    collection(db, "conversations"),
    where(matchField, "==", userId),
    orderBy("lastMessageTimestamp", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const conversations: Conversation[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Conversation));
      callback(conversations);
    },
    (error) => {
      console.error("Error fetching conversations:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribe to the total number of unread messages across all conversations for a user.
 * Queries read==false and filters client-side for messages not from the current user,
 * avoiding a compound inequality index requirement.
 */
export function subscribeToUnreadMessageCount(
  uid: string,
  role: "homeowner" | "contractor",
  callback: (count: number) => void
): Unsubscribe {
  const matchField = role === "homeowner" ? "homeownerUid" : "contractorUid";
  const unsubConvMap = new Map<string, Unsubscribe>();
  const countMap = new Map<string, number>();

  const emitTotal = () => {
    let total = 0;
    countMap.forEach((v) => { total += v; });
    callback(total);
  };

  const convQ = query(
    collection(db, "conversations"),
    where(matchField, "==", uid)
  );

  const unsubConv = onSnapshot(
    convQ,
    (snapshot) => {
      const activeIds = new Set(snapshot.docs.map((d) => d.id));

      // Remove subs for deleted conversations.
      unsubConvMap.forEach((unsub, id) => {
        if (!activeIds.has(id)) {
          unsub();
          unsubConvMap.delete(id);
          countMap.delete(id);
        }
      });

      // Add subs for new conversations.
      snapshot.docs.forEach((convDoc) => {
        if (!unsubConvMap.has(convDoc.id)) {
          const convId = convDoc.id;
          const msgQ = query(
            collection(db, "conversations", convId, "messages"),
            where("read", "==", false)
          );
          const unsubMsg = onSnapshot(msgQ, (msgSnap) => {
            const unread = msgSnap.docs.filter(
              (d) => d.data().senderId !== uid
            ).length;
            countMap.set(convId, unread);
            emitTotal();
          });
          unsubConvMap.set(convId, unsubMsg);
        }
      });

      if (snapshot.empty) callback(0);
    },
    () => callback(0)
  );

  return () => {
    unsubConv();
    unsubConvMap.forEach((unsub) => unsub());
  };
}

/**
 * Subscribe to messages in a conversation (real-time).
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const messagesCollectionRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );
  const q = query(messagesCollectionRef, orderBy("timestamp", "asc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Message));
      callback(messages);
    },
    (error) => {
      console.error("Error fetching messages:", error);
      if (onError) onError(error);
    }
  );
}

