import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatPage from "@/app/page";
import { useAuth } from "@/app/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { Chat } from "@/app/modules/chat/chat.types";
import { Timestamp } from "firebase/firestore";

// 1. Mocks
jest.mock("firebase/auth", () => ({
  signOut: jest.fn(() => Promise.resolve()),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("@/app/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/app/lib/firebase-client", () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue("fake-token"),
    },
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockScrollIntoView = jest.fn();
window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;

Object.defineProperty(global, "crypto", {
  value: { randomUUID: jest.fn(() => "test-session-id") },
});

const mockAuthenticatedUser = (
  user = { uid: "123", email: "test@example.com", displayName: "Test User" },
) => {
  (useAuth as jest.Mock).mockReturnValue({ user, loading: false });
};

const mockUrlChatId = (chatId: string | null) => {
  const mockGet = jest.fn().mockReturnValue(chatId);
  (useSearchParams as jest.Mock).mockReturnValue({ get: mockGet });
};

const renderWithHistory = async (initialChats: Chat[] = []) => {
  mockAuthenticatedUser();
  mockUrlChatId(null);

  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ chats: initialChats }),
  });

  await act(async () => {
    render(<ChatPage />);
  });

  await waitFor(() => {
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
};

describe("ChatPage Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockScrollIntoView.mockClear();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ chats: [], messages: [], reply: "" }),
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
    });
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });
  });

  it("renders the chat header and input", async () => {
    await renderWithHistory();
    expect(screen.getAllByText("AI Chat").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("Type your message...")).toBeInTheDocument();
  });

  it("shows user name in header", async () => {
    mockAuthenticatedUser({ uid: "123", email: "t@e.com", displayName: "Test User" });
    await renderWithHistory([]);
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

 it("allows the user to type and send a message", async () => {
  const user = userEvent.setup();
  
  mockAuthenticatedUser();
  mockUrlChatId(null);

  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ chat: { id: "new-1", title: "New" } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: "AI Response" }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) });

  await act(async () => {
    render(<ChatPage />);
  });

  await waitFor(() => {
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  const input = await screen.findByPlaceholderText(/type your message/i);

  // userEvent يحاكي الكتابة الحقيقية ويحدّث الـ state صح
  await user.type(input, "Hello");

  expect(input).toHaveValue("Hello");

  const sendButton = screen.getByRole("button", { name: /send/i });
  expect(sendButton).not.toBeDisabled();

  await user.click(sendButton);

  const aiResponse = await screen.findByText(/AI Response/i, {}, { timeout: 5000 });
  expect(aiResponse).toBeInTheDocument();
}, 15000);
  describe("Sidebar Actions", () => {
    const mockChats: Chat[] = [
      { id: "c1", title: "Chat One", userId: "123", createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
    ];

    it("deletes a chat after user confirmation", async () => {
      await renderWithHistory(mockChats);
      const confirmSpy = jest.spyOn(window, "confirm").mockImplementation(() => true);
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const deleteBtn = screen.getByLabelText("Delete chat");
      await act(async () => { fireEvent.click(deleteBtn); });

      await waitFor(() => {
        expect(screen.queryByText("Chat One")).not.toBeInTheDocument();
      });
      confirmSpy.mockRestore();
    });

    it("renames a chat when pressing Enter in edit mode", async () => {
      await renderWithHistory(mockChats);
      fireEvent.click(screen.getByLabelText("Edit chat title"));
      const input = screen.getByDisplayValue("Chat One");
      fireEvent.change(input, { target: { value: "Updated Name" } });
      mockFetch.mockResolvedValueOnce({ ok: true });

      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      });

      await waitFor(() => {
        const updatedNames = screen.getAllByText("Updated Name");
        expect(updatedNames.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("switches chat when clicking on a chat item", async () => {
      const twoChats = [
        ...mockChats,
        { id: "c2", title: "Chat Two", userId: "123", createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
      ];
      await renderWithHistory(twoChats);

      const secondChat = screen.getByText("Chat Two");
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [] }) });

      await act(async () => { fireEvent.click(secondChat); });

      expect(secondChat.closest("button")).toHaveClass("bg-indigo-700");
    });
  });

  it("toggles sidebar visibility on button click", async () => {
    await renderWithHistory([]);
    const toggleBtn = screen.getByLabelText(/close sidebar|open sidebar/i);

    await act(async () => { fireEvent.click(toggleBtn); });
    
    await waitFor(() => {
      const sidebarTitle = screen.queryByRole("heading", { name: /ai chat/i });
      expect(sidebarTitle).not.toBeInTheDocument();
    });

    await act(async () => { fireEvent.click(toggleBtn); });
    expect(screen.getByRole("heading", { name: /ai chat/i })).toBeVisible();
  });

  it("redirects to login if not authenticated", async () => {
    const routerPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: routerPush, replace: jest.fn() });
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });

    await act(async () => { render(<ChatPage />); });

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/auth/login");
    });
  });
});