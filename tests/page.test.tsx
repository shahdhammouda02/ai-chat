import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import ChatPage from "@/app/page";
import { useAuth } from "@/app/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { Chat } from "@/app/modules/chat/chat.types";

// 1. Mocks لـ Firebase و Next Navigation
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

// 2. إعداد الـ Mocks العالمية
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockScrollIntoView = jest.fn();
window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;

Object.defineProperty(global, "crypto", {
  value: { randomUUID: jest.fn(() => "test-session-id") },
});

// 3. Helpers للمحاكاة
const mockAuthenticatedUser = (
  user = { uid: "123", email: "test@example.com", displayName: "Test User" },
) => {
  (useAuth as jest.Mock).mockReturnValue({ user, loading: false });
};

const mockUnauthenticatedUser = () => {
  (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });
};

const mockUrlChatId = (chatId: string | null) => {
  const mockGet = jest.fn().mockReturnValue(chatId);
  (useSearchParams as jest.Mock).mockReturnValue({ get: mockGet });
};

const renderWithHistory = async (initialChats: Chat[] = []) => {
  mockAuthenticatedUser();
  mockUrlChatId(null);

  // الرد الخاص بأول نداء fetch (جلب الشاتات)
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

// 4. جناح الاختبارات
describe("ChatPage", () => {
  beforeEach(() => {
    // مهم جداً: ترتيب العمليات
    jest.clearAllMocks();
    mockFetch.mockReset(); // يمسح كل شيء
    mockScrollIntoView.mockClear();

    // الحل الجذري: إعطاء رد افتراضي آمن مباشرة بعد الـ Reset
    // لكي لا ينهار الـ useEffect الذي يعمل في الخلفية
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ chats: [], messages: [], reply: "" }),
    });

    // إعدادات افتراضية للـ Hooks
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
    expect(
      screen.getByPlaceholderText("Type your message..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("shows user name in header", async () => {
    mockAuthenticatedUser({
      uid: "123",
      email: "test@example.com",
      displayName: "Test User",
    });
    mockUrlChatId(null);

    // محاكاة الطلبات التي ستحدث فور التشغيل
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chats: [] }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    await act(async () => {
      render(<ChatPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });
  });

  it("shows user email if displayName is not available", async () => {
    mockAuthenticatedUser({
      uid: "123",
      email: "test@example.com",
      displayName: "",
    });
    mockUrlChatId(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chats: [] }),
    });

    await act(async () => {
      render(<ChatPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });

  it("allows the user to type and send a message (creates new chat first)", async () => {
    mockAuthenticatedUser();
    mockUrlChatId(null);

    const newChatId = "new-chat-id";

    // إعداد تسلسل الردود المتوقع
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) }) // Initial fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chat: { id: newChatId, title: "New Chat" } }),
      }) // POST Create
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: "Hello! I'm your AI assistant." }),
      }) // POST Message
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chats: [{ id: newChatId, title: "AI Chat Title" }],
        }),
      }); // Final refresh

    await act(async () => {
      render(<ChatPage />);
    });

    const input = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button", { name: /send/i });

    fireEvent.change(input, { target: { value: "Hello, AI!" } });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    await waitFor(
      () => {
        expect(
          screen.getByText(/Hello! I'm your AI assistant/i),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("sends message on Enter key", async () => {
    mockAuthenticatedUser();
    mockUrlChatId(null);

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chat: { id: "123" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: "Hello!" }),
      });

    await act(async () => {
      render(<ChatPage />);
    });

    const input = screen.getByPlaceholderText("Type your message...");
    fireEvent.change(input, { target: { value: "Enter message" } });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    });

    await waitFor(() => {
      expect(screen.getByText("Hello!")).toBeInTheDocument();
    });
  });

  it("does not send empty message", async () => {
    await renderWithHistory();
    const sendButton = screen.getByRole("button", { name: /send/i });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(document.querySelector(".bg-indigo-100")).toBeNull();
  });

  it("displays AI response after fetch resolves", async () => {
    mockAuthenticatedUser();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chat: { id: "1" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: "AI Response" }),
      });

    await act(async () => {
      render(<ChatPage />);
    });

    const input = screen.getByPlaceholderText("Type your message...");
    fireEvent.change(input, { target: { value: "Hi" } });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    });

    await waitFor(() => {
      expect(screen.getByText("AI Response")).toBeInTheDocument();
    });
  });

  it("disables send button while loading", async () => {
    mockAuthenticatedUser();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chats: [] }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chat: { id: "1" } }),
    });

    let resolveResponse: (value: {
      ok: boolean;
      json: () => Promise<{ reply: string }>;
    }) => void;
    const slowPromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });
    mockFetch.mockResolvedValueOnce(slowPromise);

    await act(async () => {
      render(<ChatPage />);
    });

    const input = screen.getByPlaceholderText("Type your message...");
    fireEvent.change(input, { target: { value: "Test" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /send/i }));
    });

    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();

    await act(async () => {
      resolveResponse({ ok: true, json: async () => ({ reply: "Hello" }) });
    });
  });

  it("disables send button when input is empty or whitespace", async () => {
    await renderWithHistory();
    const sendButton = screen.getByRole("button", { name: /send/i });
    const input = screen.getByPlaceholderText("Type your message...");

    expect(sendButton).toBeDisabled();
    fireEvent.change(input, { target: { value: "   " } });
    expect(sendButton).toBeDisabled();
    fireEvent.change(input, { target: { value: "Hello" } });
    expect(sendButton).not.toBeDisabled();
  });

  it("scrolls to bottom when messages update", async () => {
    mockAuthenticatedUser();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chat: { id: "1" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: "Hello!" }),
      });

    await act(async () => {
      render(<ChatPage />);
    });

    mockScrollIntoView.mockClear();
    const input = screen.getByPlaceholderText("Type your message...");
    fireEvent.change(input, { target: { value: "scroll" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /send/i }));
    });

    await waitFor(() => {
      expect(screen.getByText("Hello!")).toBeInTheDocument();
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockScrollIntoView).toHaveBeenCalled();
  });

  it("renders messages with correct styling based on role", async () => {
    mockAuthenticatedUser();
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chat: { id: "1" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: "Assistant style" }),
      });

    await act(async () => {
      render(<ChatPage />);
    });

    fireEvent.change(screen.getByPlaceholderText("Type your message..."), {
      target: { value: "test" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /send/i }));
    });

    await waitFor(() => {
      const aiMsg = screen.getByText("Assistant style");
      expect(aiMsg).toHaveClass("bg-white");
    });
  });

  it("redirects to login if not authenticated", async () => {
    const routerPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: routerPush,
      replace: jest.fn(),
    });
    mockUnauthenticatedUser();

    await act(async () => {
      render(<ChatPage />);
    });

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/auth/login");
    });
  });
});
