"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { auth } from "@/app/lib/firebase-client";
import { signOut } from "firebase/auth";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function getOrCreateSessionId() {
  let sessionId = localStorage.getItem("chat_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("chat_session_id", sessionId);
  }
  return sessionId;
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Manage session ID (per user)
  useEffect(() => {
    if (user) {
      const id = getOrCreateSessionId();
      setSessionId(id);
    } else {
      setSessionId(null);
    }
  }, [user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch chat history when sessionId and user are ready
  useEffect(() => {
    if (!sessionId || !user) return;

    const fetchHistory = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/chat?sessionId=${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setMessages(data.messages);
        } else {
          console.error("Failed to fetch history:", data.error);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistory();
  }, [sessionId, user]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, content: userMessage.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      const assistantMessage: Message = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("chat_session_id"); // Clear session on logout
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  // Get user display name or email
  const userName = user.displayName || user.email || "User";

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with user info and sign out */}
      <div className="bg-indigo-500 text-white py-4 px-6 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg">AI Chat</span>
          <span className="text-sm bg-indigo-400 px-3 py-1 rounded-full">
            {userName}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm bg-white text-indigo-500 px-4 py-1 rounded-md hover:bg-indigo-50 transition"
        >
          Sign Out
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-indigo-100 text-indigo-900 rounded-br-sm"
                  : "bg-white text-gray-800 border rounded-bl-sm"
              }`}
            >
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

      {/* Input */}
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
          className="bg-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-600 transition disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}