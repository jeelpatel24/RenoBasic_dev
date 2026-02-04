"use client";

import { useState, useEffect, useRef } from "react";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import { Conversation, Message } from "@/types";
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
} from "@/lib/messages";
import toast from "react-hot-toast";
import { HiChat, HiPaperAirplane, HiArrowLeft } from "react-icons/hi";

export default function HomeownerMessagesPage() {
  const { userProfile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userProfile) return;
    const unsub = subscribeToConversations(userProfile.uid, "homeowner", setConversations);
    return () => unsub();
  }, [userProfile]);

  useEffect(() => {
    if (!activeConv) { setMessages([]); return; }
    const unsub = subscribeToMessages(activeConv, setMessages);
    return () => unsub();
  }, [activeConv]);

  useEffect(() => {
    if (activeConv && userProfile) markMessagesAsRead(activeConv, userProfile.uid);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConv, userProfile]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConv || !userProfile) return;
    setSending(true);
    try {
      await sendMessage(activeConv, userProfile.uid, userProfile.fullName, newMessage.trim());
      setNewMessage("");
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConv);

  return (
    <ProtectedRoute allowedRoles={["homeowner"]}>
      <DashboardLayout role="homeowner">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>

          <div className="bg-white rounded-xl border border-gray-200 flex" style={{ height: "calc(100vh - 220px)" }}>
            {/* Conversation List */}
            <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${activeConv ? "hidden md:flex" : "flex"}`}>
              <div className="p-4 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-500">
                  {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <HiChat size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">Contractors will message you after unlocking your projects.</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConv(conv.id)}
                      className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        activeConv === conv.id ? "bg-orange-50 border-l-2 border-l-orange-500" : ""
                      }`}
                    >
                      <p className="font-medium text-gray-900 text-sm">{conv.contractorName}</p>
                      <p className="text-xs text-orange-600 mt-0.5">{conv.projectCategory}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate">{conv.lastMessage || "No messages yet"}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${!activeConv ? "hidden md:flex" : "flex"}`}>
              {activeConv && activeConversation ? (
                <>
                  <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                    <button className="md:hidden text-gray-500" onClick={() => setActiveConv(null)}>
                      <HiArrowLeft size={20} />
                    </button>
                    <div>
                      <p className="font-medium text-gray-900">{activeConversation.contractorName}</p>
                      <p className="text-xs text-orange-600">{activeConversation.projectCategory}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg) => {
                      const isMine = msg.senderId === userProfile?.uid;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                            isMine
                              ? "bg-orange-500 text-white rounded-br-md"
                              : "bg-gray-100 text-gray-800 rounded-bl-md"
                          }`}>
                            <p>{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isMine ? "text-orange-100" : "text-gray-400"}`}>
                              {new Date(msg.timestamp).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-gray-100 flex gap-3">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <Button
                      size="sm"
                      onClick={handleSend}
                      disabled={!newMessage.trim() || sending}
                      className="!rounded-full !px-4"
                    >
                      <HiPaperAirplane size={18} />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <HiChat size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Select a conversation</p>
                    <p className="text-sm mt-1">Choose from the list to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

