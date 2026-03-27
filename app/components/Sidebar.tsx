"use client";

import { Chat } from "@/app/modules/chat/chat.types";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => Promise<void>;
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
  disabled = false,
}: SidebarProps) {
  const safeChats = chats ?? [];

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this chat?")) {
      await onDeleteChat(chatId);
    }
  };

  return (
    <>
      {/* Overlay for mobile – semi‑transparent black */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-gray-800 text-white w-64 transform transition-transform duration-300 ease-in-out z-30 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">AI Chat</h2>
          <button
            onClick={onToggle}
            className="p-1 rounded-md hover:bg-gray-700 md:hidden"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={onNewChat}
            disabled={disabled}
            className={`w-full bg-indigo-600 text-white py-2 rounded-md transition ${
              disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"
            }`}
          >
            + New Chat
          </button>

          <div className="space-y-2 mt-4">
            {safeChats.map((chat) => (
              <div
                key={chat.id}
                className="flex items-center justify-between group relative"
              >
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className={`flex-1 text-left px-3 py-2 rounded-md truncate ${
                    currentChatId === chat.id
                      ? "bg-indigo-700"
                      : "hover:bg-gray-700"
                  }`}
                >
                  {chat.title}
                </button>
                <div className="w-8 flex justify-end">
                  <button
                    onClick={(e) => handleDelete(e, chat.id)}
                    className="p-1 rounded-md hover:bg-red-600 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label="Delete chat"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Toggle button – only visible on mobile */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-40 p-2 bg-indigo-600 text-white rounded-md shadow-md md:hidden"
      >
        ☰
      </button>
    </>
  );
}