"use client"

import { useState, useRef, useEffect } from "react"

type Message = {
  role: "user" | "assistant"
  content: string
}

function getOrCreateSessionId() {
  let sessionId = localStorage.getItem("chat_session_id")

  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem("chat_session_id", sessionId)
  }

  return sessionId
}
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)

   useEffect(() => {
    const id = getOrCreateSessionId()
    setSessionId(id)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

 useEffect(() => {
    if (!sessionId) return

    const fetchHistory = async () => {
      const res = await fetch(`/api/chat?sessionId=${sessionId}`)
      const data = await res.json()

      if (res.ok) {
        setMessages(
          data.messages.map((msg: Message) => ({
            role: msg.role,
            content: msg.content,
          }))
        )
      }
    }

    fetchHistory()
  }, [sessionId])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

   try{
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, content: userMessage.content }),
    });

    const data = await res.json();
    if(!res.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    const assistantMessage: Message = { role: "assistant", content: data.reply };

    setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: unknown) {
      console.error("Error sending message:", error);
   } finally {
    setLoading(false);
   }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend()
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-500 text-white py-4 text-center font-semibold text-lg shadow-md">
        AI Chat
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
          className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-600 transition disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}