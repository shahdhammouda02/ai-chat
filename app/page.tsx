"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { auth } from "@/app/lib/firebase-client";
import { signOut } from "firebase/auth";
import { LogIn, LogOut, MessageSquare, Sparkles, Lock, Send } from "lucide-react";
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
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-[#0d0f14] w-full overflow-y-auto">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-linear-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <MessageSquare className="h-10 w-10 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Welcome to AI Chat</h1>
          <p className="text-white/40 text-base leading-relaxed px-4">
            Your intelligent conversation partner. Sign in to start chatting
            with AI and unlock the full experience.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-left backdrop-blur-sm mx-4 sm:mx-0">
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

        <div className="px-4 w-full">
          <button
            onClick={onSignIn}
            className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-indigo-500 to-purple-500 text-white py-3 px-6 rounded-xl font-semibold text-base hover:opacity-90 transition shadow-md shadow-indigo-500/20"
          >
            <LogIn className="h-5 w-5" />
            Sign In to Get Started
          </button>
        </div>
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
    } else if (!currentChatId && urlChatId && chats.some((c) => c.id === urlChatId)) {
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
          const uniqueChats = Array.from(new Map(chatsArray.map((chat) => [chat.id, chat])).values());
          setChats(uniqueChats);
          if (urlChatId && uniqueChats.some((c) => c.id === urlChatId)) {
            setCurrentChatId(urlChatId);
          } else if (uniqueChats.length > 0 && !currentChatId) {
            setCurrentChatId(uniqueChats[0].id);
          }
        }
      } catch (err) { console.error(err); }
    };
    fetchChats();
  }, [user]);

  useEffect(() => {
    if (!user || !currentChatId) return;
    const fetchMessages = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const { res, data } = await fetchJSON(`/api/chat/${currentChatId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setMessages(data.messages);
      } catch (err) { console.error(err); }
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
      }
      return null;
    } catch (err) { return null; } finally { setCreatingChat(false); }
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: input }),
      });
      if (!res.ok) throw new Error();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [input, user, currentChatId, handleNewChat]);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    router.push("/auth/login");
  }, [router]);

  const handleGoToLogin = useCallback(() => router.push("/auth/login"), [router]);
  const handleDeleteChat = useCallback(async (chatId: string) => {
    if (!user) return;
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    if (currentChatId === chatId) {
      const nextChat = chats.find((c) => c.id !== chatId);
      setCurrentChatId(nextChat?.id || null);
      if (!nextChat) setMessages([]);
    }
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetchJSON(`/api/chats/${chatId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) { console.error(err); }
  }, [user, currentChatId, chats]);

  const handleRenameChat = useCallback(async (chatId: string, newTitle: string) => {
    if (!user) return;
    setChats((prev) => prev.map((chat) => chat.id === chatId ? { ...chat, title: newTitle } : chat));
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`/api/chats/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch (err) { console.error(err); }
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[#0d0f14] w-full">
        <div className="text-white/50 animate-pulse">Loading...</div>
      </div>
    );
  }

  const layoutWrapperClasses = `flex-1 flex flex-col min-w-0 h-[100dvh] transition-all duration-300 relative ${
    sidebarOpen ? "ml-0 md:ml-64" : "ml-0 md:ml-16"
  }`;

  const renderContent = (isLoggedIn: boolean) => (
    <div className="flex h-dvh w-full bg-[#0d0f14] overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        chats={isLoggedIn ? chats : []}
        currentChatId={currentChatId}
        onSelectChat={(id) => setCurrentChatId(id)}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        userName={isLoggedIn ? (user?.displayName || user?.email || "User") : ""}
        onSignOut={handleSignOut}
        disabled={!isLoggedIn || creatingChat || loading}
      />

      <div className={layoutWrapperClasses}>
        {/* Header */}
        <div className="bg-linear-to-r from-indigo-500 to-purple-500 text-white flex justify-between items-center shadow-md sticky top-0 z-20 h-16 px-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 md:hidden shrink-0" />
            <span className="font-semibold text-base md:text-lg truncate ml-2">
              {isLoggedIn ? currentChatTitle : "AI Chat"}
            </span>
          </div>
          {isLoggedIn ? (
            <button onClick={handleSignOut} className="bg-white/10 p-2 md:px-4 md:py-1 rounded-md hover:bg-white/20 transition flex items-center gap-2">
              <span className="hidden md:inline text-sm font-medium">Sign Out</span>
              <LogOut className="h-5 w-5 md:hidden" />
            </button>
          ) : (
            <button onClick={handleGoToLogin} className="bg-white/10 p-2 md:px-4 md:py-1 rounded-md hover:bg-white/20 transition flex items-center gap-2">
              <span className="hidden md:inline text-sm font-medium">Sign In</span>
              <LogIn className="h-5 w-5 md:hidden" />
            </button>
          )}
        </div>

        {!isLoggedIn ? (
          <WelcomeScreen onSignIn={handleGoToLogin} />
        ) : (
          <>
            {/* Chat Area - Aligned exactly under the title on mobile */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pl-20 md:pl-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm wrap-break-words ${
                      msg.role === "user" ? "bg-indigo-500/20 text-white rounded-br-sm" : "bg-white/5 border border-white/10 text-white/80 rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl text-sm animate-pulse text-white/40">AI is typing...</div>
                </div>
              )}
              <div ref={bottomRef} className="h-2" />
            </div>

            {/* Input Area - Aligned exactly under the title on mobile with Icon button */}
            <div className="border-t border-white/10 bg-white/5 backdrop-blur-sm p-4 shrink-0 pl-20 md:pl-4">
              <div className="w-full flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your message..."
                  disabled={loading}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 min-w-0"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-linear-to-r from-indigo-500 to-purple-500 text-white px-4 py-3 md:px-6 rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-50 shrink-0 flex items-center justify-center"
                >
                  <span className="hidden md:inline">Send</span>
                  <Send className="h-5 w-5 md:hidden" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return renderContent(!!user);
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#0d0f14] flex items-center justify-center text-white/50">Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}