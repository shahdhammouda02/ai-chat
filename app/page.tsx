"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { auth } from "@/app/lib/firebase-client";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import Sidebar from "@/app/components/Sidebar";
import { Chat } from "@/app/modules/chat/chat.types";

type Message = {
  role: "user" | "assistant";
  content: string;
};

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json();
  return { res, data };
}

function ChatPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get("chat");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const currentChat = chats.find((c) => c.id === currentChatId);
  const currentChatTitle = currentChat?.title || "AI Chat";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (currentChatId && currentChatId !== urlChatId) {
      router.replace(`/?chat=${currentChatId}`, { scroll: false });
    } else if (
      !currentChatId &&
      urlChatId &&
      chats.some((c) => c.id === urlChatId)
    ) {
      setCurrentChatId(urlChatId);
    } else if (!currentChatId && urlChatId) {
      router.replace("/", { scroll: false });
    }
  }, [currentChatId, urlChatId, chats, router]);

  useEffect(() => {
    if (!user) return;

    const fetchChats = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const { res, data } = await fetchJSON("/api/chats", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok && Array.isArray(data.chats)) {
          const chatsArray = data.chats as Chat[];
          const uniqueChats = Array.from(
            new Map(chatsArray.map((chat) => [chat.id, chat])).values(),
          );
          setChats(uniqueChats);

          if (urlChatId && uniqueChats.some((c) => c.id === urlChatId)) {
            setCurrentChatId(urlChatId);
          } else if (uniqueChats.length > 0 && !currentChatId) {
            setCurrentChatId(uniqueChats[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchChats();
  }, [user]);

  useEffect(() => {
    if (!user || !currentChatId) return;

    const fetchMessages = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const { res, data } = await fetchJSON(
          `/api/chat/${currentChatId}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (res.ok) {
          setMessages(data.messages);
        } else {
          console.error("Failed to fetch messages:", data.error);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
  }, [user, currentChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = useCallback(async (): Promise<string | null> => {
    if (!user || creatingChat) return null;

    setCreatingChat(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const { res, data } = await fetchJSON("/api/chats", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok && data.chat) {
        const newChat = data.chat as Chat;

        setChats((prev) => {
          const map = new Map(prev.map((c) => [c.id, c]));
          map.set(newChat.id, newChat);
          return Array.from(map.values());
        });

        setCurrentChatId(newChat.id);
        setMessages([]);

        return newChat.id;
      } else {
        console.error("Failed to create chat:", data.error);
        return null;
      }
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setCreatingChat(false);
    }
  }, [user, creatingChat]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !user) return;

    let chatId = currentChatId;

    if (!chatId) {
      chatId = await handleNewChat();
      if (!chatId) return;
    }

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const { res, data } = await fetchJSON(`/api/chat/${chatId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: input }),
      });

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (messages.length === 0) {
        const freshToken = await auth.currentUser?.getIdToken();
        const { res: chatsRes, data: chatsData } = await fetchJSON(
          "/api/chats",
          {
            headers: { Authorization: `Bearer ${freshToken}` },
          },
        );

        if (chatsRes.ok && Array.isArray(chatsData.chats)) {
          const uniqueChats = Array.from(
            new Map(
              chatsData.chats.map((chat: Chat) => [chat.id, chat]),
            ).values(),
          ) as Chat[];

          setChats(uniqueChats);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [input, user, currentChatId, messages.length, handleNewChat]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    router.push("/auth/login");
  }, [router]);

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      if (!user) return;

      setChats((prev) => prev.filter((chat) => chat.id !== chatId));

      if (currentChatId === chatId) {
        const nextChat = chats.find((c) => c.id !== chatId);
        setCurrentChatId(nextChat?.id || null);
        if (!nextChat) setMessages([]);
      }

      try {
        const token = await auth.currentUser?.getIdToken();
        const { res } = await fetchJSON(`/api/chats/${chatId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error();
      } catch (err) {
        const freshToken = await auth.currentUser?.getIdToken();
        const { res: res2, data: data2 } = await fetchJSON("/api/chats", {
          headers: { Authorization: `Bearer ${freshToken}` },
        });

        if (res2.ok && Array.isArray(data2.chats))
          setChats(data2.chats as Chat[]);
      }
    },
    [user, currentChatId, chats],
  );

  const handleSelectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
    // Do NOT close sidebar when selecting a chat
    // setSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  const handleRenameChat = useCallback(
    async (chatId: string, newTitle: string) => {
      if (!user) return;

      const originalChat = chats.find((c) => c.id === chatId);
      const originalTitle = originalChat?.title;

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, title: newTitle } : chat,
        ),
      );

      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/chats/${chatId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: newTitle }),
        });

        if (!res.ok) {
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === chatId
                ? { ...chat, title: originalTitle || "New Chat" }
                : chat,
            ),
          );
          console.error("Failed to rename chat");
        }
      } catch (err) {
        console.error(err);
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, title: originalTitle || "New Chat" }
              : chat,
          ),
        );
      }
    },
    [user, chats],
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const userName = user.displayName || user.email || "User";

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        userName={userName}
        onSignOut={handleSignOut}
        disabled={creatingChat || loading}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "ml-0 md:ml-64" : "ml-0 md:ml-16"
        } pl-14 md:pl-0`} 
      >
        {/* Header */}
        <div className="bg-indigo-500 text-white py-4 px-4 flex justify-between items-center shadow-md sticky top-0 z-20 h-16">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-10 md:hidden shrink-0" />
            <span className="font-semibold text-base md:text-lg truncate ml-3">
              {currentChatTitle}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-white text-indigo-500 p-2 md:px-4 md:py-1 rounded-md hover:bg-indigo-50 transition flex items-center justify-center shrink-0"
          >
            <span className="hidden md:inline text-sm font-medium">Sign Out</span>
            <LogOut className="h-5 w-5 md:hidden" />
          </button>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                  msg.role === "user" ? "bg-indigo-100 text-indigo-900 rounded-br-sm" : "bg-white text-gray-800 border rounded-bl-sm"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border px-4 py-3 rounded-2xl shadow-sm text-sm animate-pulse text-gray-500">
                AI is typing...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="border-t bg-white p-4 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-600 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
