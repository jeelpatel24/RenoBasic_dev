import { db } from "@/lib/firebase";
import { ref, get, set, push, update, onValue, Unsubscribe } from "firebase/database";
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
  const conversationRef = ref(db, `conversations/${conversationId}`);
  const snapshot = await get(conversationRef);

  if (!snapshot.exists()) {
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

    await set(conversationRef, conversation);
  }

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
  const messagesRef = ref(db, `conversations/${conversationId}/messages`);
  const newMsgRef = push(messagesRef);
  const now = new Date().toISOString();

  const message: Omit<Message, "id"> = {
    senderId,
    senderName,
    content,
    timestamp: now,
    read: false,
  };

  await set(newMsgRef, { ...message, id: newMsgRef.key });

  // Update conversation metadata
  const conversationRef = ref(db, `conversations/${conversationId}`);
  const snapshot = await get(conversationRef);
  const currentCount = snapshot.exists() ? (snapshot.val().messageCount || 0) : 0;

  await update(conversationRef, {
    lastMessage: content.length > 80 ? content.substring(0, 80) + "..." : content,
    lastMessageTimestamp: now,
    messageCount: currentCount + 1,
  });
}

/**
 * Mark all messages not from currentUser as read.
 */
export async function markMessagesAsRead(
  conversationId: string,
  currentUserId: string
): Promise<void> {
  const messagesRef = ref(db, `conversations/${conversationId}/messages`);
  const snapshot = await get(messagesRef);

  if (!snapshot.exists()) return;

  const updates: Record<string, boolean> = {};
  const data = snapshot.val() as Record<string, Message>;

  Object.entries(data).forEach(([key, msg]) => {
    if (msg.senderId !== currentUserId && !msg.read) {
      updates[`conversations/${conversationId}/messages/${key}/read`] = true;
    }
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
}

/**
 * Subscribe to conversations for a user (real-time).
 */
export function subscribeToConversations(
  userId: string,
  role: "homeowner" | "contractor",
  callback: (conversations: Conversation[]) => void
): Unsubscribe {
  const conversationsRef = ref(db, "conversations");
  return onValue(conversationsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val() as Record<string, Conversation & { messages?: Record<string, Message> }>;
    const conversations: Conversation[] = [];

    Object.entries(data).forEach(([id, conv]) => {
      const matchField = role === "homeowner" ? "homeownerUid" : "contractorUid";
      if (conv[matchField] === userId) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { messages, ...conversationData } = conv;
        conversations.push({ ...conversationData, id });
      }
    });

    conversations.sort(
      (a, b) =>
        new Date(b.lastMessageTimestamp).getTime() -
        new Date(a.lastMessageTimestamp).getTime()
    );

    callback(conversations);
  });
}

/**
 * Subscribe to messages in a conversation (real-time).
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  const messagesRef = ref(db, `conversations/${conversationId}/messages`);
  return onValue(messagesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val() as Record<string, Message>;
    const messages: Message[] = Object.entries(data).map(([key, msg]) => ({
      ...msg,
      id: key,
    }));

    messages.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    callback(messages);
  });
}

