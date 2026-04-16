"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/app/lib/firebase-client";
import { Chat } from "@/app/modules/chat/chat.types";
import type { User } from "firebase/auth";

type Message = {
  role: "user" | "assistant";
  content: string;
};

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json();
  return { res, data };
}

export function useChatManager(user: User | null) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get("chat");

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  const currentChat = chats.find((c) => c.id === currentChatId);
  const currentChatTitle = currentChat?.title || "AI Chat";

  // Sync URL with current chat
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

  // Fetch chats
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

  // Fetch messages when chat changes
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
        if (res.ok) setMessages(data.messages);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, [user, currentChatId]);

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
    } catch (err) {
      return null;
    } finally {
      setCreatingChat(false);
    }
  }, [user, creatingChat]);

  const handleSend = useCallback(
    async (input: string) => {
      if (!input.trim() || !user) return;
      let chatId = currentChatId;
      if (!chatId) {
        chatId = await handleNewChat();
        if (!chatId) return;
      }
      const userMessage: Message = { role: "user", content: input };
      setMessages((prev) => [...prev, userMessage]);
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
        if (!res.ok) throw new Error();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);

        // Refresh chats list after sending message (preserving original behavior)
        const chatsRes = await fetchJSON("/api/chats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (chatsRes.res.ok && Array.isArray(chatsRes.data.chats)) {
          const updated = Array.from(
            new Map(
              (chatsRes.data.chats as Chat[]).map((c) => [c.id, c]),
            ).values(),
          );
          setChats(updated);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [user, currentChatId, handleNewChat],
  );

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
        await fetchJSON(`/api/chats/${chatId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error(err);
      }
    },
    [user, currentChatId, chats],
  );

  const handleRenameChat = useCallback(
    async (chatId: string, newTitle: string) => {
      if (!user) return;
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, title: newTitle } : chat,
        ),
      );
      try {
        const token = await auth.currentUser?.getIdToken();
        await fetch(`/api/chats/${chatId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: newTitle }),
        });
      } catch (err) {
        console.error(err);
      }
    },
    [user],
  );

  const handleSelectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
  }, []);

  return {
    // State
    chats,
    currentChatId,
    messages,
    loading,
    creatingChat,
    currentChatTitle,

    // Actions
    handleNewChat,
    handleSend,
    handleDeleteChat,
    handleRenameChat,
    handleSelectChat,
  };
}
