"use client";

import { useState } from "react";
import { Chat } from "@/app/modules/chat/chat.types";
import {
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  LogOut,
  SidebarIcon,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => Promise<void>;
  onRenameChat: (chatId: string, newTitle: string) => Promise<void>;
  userName: string;
  onSignOut: () => void;
  disabled?: boolean;
}

export default function Sidebar({
  isOpen,
  onToggle,
  chats = [],
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  userName,
  onSignOut,
  disabled = false,
}: SidebarProps) {
  const safeChats = chats ?? [];
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this chat?")) {
      await onDeleteChat(chatId);
    }
  };

  const handleEditStart = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSave = async (chatId: string, originalTitle: string) => {
    const trimmed = editTitle.trim();
    if (trimmed === "") {
      setEditingChatId(null);
      return;
    }
    if (trimmed !== originalTitle) {
      await onRenameChat(chatId, trimmed);
    }
    setEditingChatId(null);
  };

  const handleCancel = () => {
    setEditingChatId(null);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    chatId: string,
    originalTitle: string,
  ) => {
    if (e.key === "Enter") {
      handleSave(chatId, originalTitle);
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  const userInitials = getInitials(userName);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-gray-800 text-white transition-all duration-300 ease-in-out z-30 ${
          isOpen ? "w-64" : "w-16"
        }`}
      >
        {/* Header with toggle button on the left */}
        <div
          className={`flex items-center p-4 border-b border-gray-700 ${isOpen ? "flex-row-reverse justify-between" : ""}`}
        >
          <button
            onClick={onToggle}
            className="p-1 rounded-md hover:bg-gray-700 transition"
            aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            <SidebarIcon className="h-5 w-5" />
          </button>

          {isOpen && <h2 className="text-xl font-bold">AI Chat</h2>}
        </div>

        <div className="p-4">
          <button
            onClick={onNewChat}
            disabled={disabled}
            className={`w-full flex items-center justify-center bg-indigo-600 text-white py-2 rounded-md transition ${
              disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"
            }`}
          >
            {isOpen ? "+ New Chat" : <Plus className="h-5 w-5" />}
          </button>

          <div className="space-y-2 mt-4">
            {safeChats.map((chat) => (
              <div
                key={chat.id}
                className="flex items-center justify-between group relative"
              >
                {editingChatId === chat.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleSave(chat.id, chat.title)}
                    onKeyDown={(e) => handleKeyDown(e, chat.id, chat.title)}
                    className={`${
                      isOpen ? "flex-1" : "w-full"
                    } px-3 py-2 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400`}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <button
                    onClick={() => onSelectChat(chat.id)}
                    className={`${
                      isOpen ? "flex-1 text-left" : "flex justify-center w-full"
                    } px-3 py-2 rounded-md ${
                      currentChatId === chat.id
                        ? "bg-indigo-700"
                        : "hover:bg-gray-700"
                    }`}
                  >
                    {isOpen ? (
                      <span className="truncate">{chat.title}</span>
                    ) : (
                      <MessageSquare className="h-5 w-5" />
                    )}
                  </button>
                )}

                {/* Show edit/delete only when sidebar is open */}
                {isOpen && editingChatId !== chat.id && (
                  <div className="flex gap-1 items-center ml-1">
                    <button
                      onClick={(e) => handleEditStart(e, chat)}
                      className="p-1 rounded-md hover:bg-gray-600 transition"
                      aria-label="Edit chat title"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, chat.id)}
                      className="p-1 rounded-md hover:bg-red-600 transition"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section with user info and logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            {isOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-medium">
                    {userInitials}
                  </div>
                  <span className="text-sm truncate">{userName}</span>
                </div>
                <button
                  onClick={onSignOut}
                  className="p-1 rounded-md hover:bg-gray-700 transition"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <div className="flex justify-center w-full">
                <button
                  onClick={onSignOut}
                  className="p-1 rounded-md hover:bg-gray-700 transition"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
