"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { auth } from "@/app/lib/firebase-client";
import { signOut } from "firebase/auth";
import { LogIn, LogOut, MessageSquare, Sparkles, Lock } from "lucide-react";
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

function WelcomeScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0d0f14]">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-linear-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <MessageSquare className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Welcome to AI Chat</h1>
          <p className="text-white/40 text-base leading-relaxed">
            Your intelligent conversation partner. Sign in to start chatting
            with AI and unlock the full experience.
          </p>
        </div>

        {/* Features */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-left backdrop-blur-sm">
          {[
            {
              icon: <Sparkles className="h-4 w-4 text-indigo-400" />,
              text: "Powered by Gemini AI for smart, accurate responses",
            },
            {
              icon: <MessageSquare className="h-4 w-4 text-indigo-400" />,
              text: "Save and manage all your conversations",
            },
            {
              icon: <Lock className="h-4 w-4 text-indigo-400" />,
              text: "Your chats are private and securely stored",
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{item.icon}</div>
              <span className="text-sm text-white/60">{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onSignIn}
          className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-indigo-500 to-purple-500 text-white py-3 px-6 rounded-xl font-semibold text-base hover:opacity-90 transition shadow-md shadow-indigo-500/20"
        >
          <LogIn className="h-5 w-5" />
          Sign In to Get Started
        </button>

        <p className="text-xs text-white/30">
          Don&apos;t have an account? You can create one on the sign-in page.
        </p>
      </div>
    </div>
  );
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
    if (!user) return;
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
  }, [currentChatId, urlChatId, chats, router, user]);

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

  const handleGoToLogin = useCallback(() => {
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
      <div className="flex items-center justify-center h-screen bg-[#0d0f14]">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  // Unauthenticated view
  if (!user) {
    return (
      <div className="flex h-screen bg-[#0d0f14]">
        {/* Minimal sidebar — no chats, new chat disabled */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          chats={[]}
          currentChatId={null}
          onSelectChat={() => {}}
          onNewChat={() => {}}
          onDeleteChat={async () => {}}
          onRenameChat={async () => {}}
          userName=""
          onSignOut={() => {}}
          disabled={true}
        />

        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${
            sidebarOpen ? "ml-0 md:ml-64" : "ml-0 md:ml-16"
          } pl-14 md:pl-0`}
        >
          {/* Header with Sign In button */}
          <div className="bg-linear-to-r from-indigo-500 to-purple-500 text-white py-4 px-4 flex justify-between items-center shadow-md sticky top-0 z-20 h-16">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-10 md:hidden shrink-0" />
              <span className="font-semibold text-base md:text-lg truncate ml-3">
                AI Chat
              </span>
            </div>
            <button
              onClick={handleGoToLogin}
              className="bg-white/10 backdrop-blur-sm text-white p-2 md:px-4 md:py-1 rounded-md hover:bg-white/20 transition flex items-center justify-center gap-2 shrink-0"
            >
              <span className="hidden md:inline text-sm font-medium">
                Sign In
              </span>
              <LogIn className="h-5 w-5 md:hidden" />
            </button>
          </div>

          <WelcomeScreen onSignIn={handleGoToLogin} />
        </div>
      </div>
    );
  }

  // Authenticated view
  const userName = user.displayName || user.email || "User";

  return (
    <div className="flex h-screen bg-[#0d0f14]">
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
        <div className="bg-linear-to-r from-indigo-500 to-purple-500 text-white py-4 px-4 flex justify-between items-center shadow-md sticky top-0 z-20 h-16">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-10 md:hidden shrink-0" />
            <span className="font-semibold text-base md:text-lg truncate ml-3">
              {currentChatTitle}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-white/10 backdrop-blur-sm text-white p-2 md:px-4 md:py-1 rounded-md hover:bg-white/20 transition flex items-center justify-center shrink-0"
          >
            <span className="hidden md:inline text-sm font-medium">
              Sign Out
            </span>
            <LogOut className="h-5 w-5 md:hidden" />
          </button>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                  msg.role === "user"
                    ? "bg-linear-to-r from-indigo-500/20 to-purple-500/20 text-white rounded-br-sm"
                    : "bg-white/5 border border-white/10 text-white/80 rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl shadow-sm text-sm animate-pulse text-white/40">
                AI is typing...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 bg-white/5 backdrop-blur-sm p-4 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-white/5 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-linear-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
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
    <Suspense
      fallback={<div className="bg-[#0d0f14] text-white/50">Loading...</div>}
    >
      <ChatPageContent />
    </Suspense>
  );
}
