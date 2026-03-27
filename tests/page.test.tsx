import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mock firebase/auth first (before any imports that use it)
jest.mock('firebase/auth', () => ({
  signOut: jest.fn(() => Promise.resolve()),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}))

// Mock useAuth
jest.mock('@/app/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// Mock firebase-client
jest.mock('@/app/lib/firebase-client', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('fake-token'),
    },
  },
}))

import ChatPage from '@/app/page'
import { useAuth } from '@/app/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { Chat } from '@/app/modules/chat/chat.types'

Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: jest.fn(() => "test-session-id"),
  },
})

beforeEach(() => {
  localStorage.clear()
  jest.clearAllMocks()
})

const mockScrollIntoView = jest.fn()
window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView

const mockFetch = jest.fn()
global.fetch = mockFetch

// Helper to mock authenticated user
const mockAuthenticatedUser = (user: { uid: string; email: string; displayName: string | null } = { uid: '123', email: 'test@example.com', displayName: 'Test User' }) => {
  ;(useAuth as jest.Mock).mockReturnValue({
    user,
    loading: false,
  })
}

// Helper to mock unauthenticated user
const mockUnauthenticatedUser = () => {
  ;(useAuth as jest.Mock).mockReturnValue({
    user: null,
    loading: false,
  })
}

// Helper to mock searchParams with a chat ID
const mockUrlChatId = (chatId: string | null) => {
  const mockGet = jest.fn()
  mockGet.mockReturnValue(chatId)
  ;(useSearchParams as jest.Mock).mockReturnValue({
    get: mockGet,
  })
}

// Helper to render page with initial chat list
const renderWithHistory = async (initialChats: Chat[] = []) => {
  mockAuthenticatedUser()
  mockUrlChatId(null)

  // Mock initial fetch of chats
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ chats: initialChats }),
  })

  render(<ChatPage />)

  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chats",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer fake-token' })
      })
    )
  })
}

describe('ChatPage', () => {
  beforeEach(() => {
    mockScrollIntoView.mockClear()
    mockFetch.mockReset()
    ;(useAuth as jest.Mock).mockReset()
    ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace: jest.fn() })
    ;(useSearchParams as jest.Mock).mockReturnValue({ get: jest.fn() })
  })

  it('renders the chat header and input', async () => {
    await renderWithHistory()
    // There are two elements with "AI Chat", so check that at least one exists
    expect(screen.getAllByText('AI Chat').length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('shows user name in header', async () => {
    mockAuthenticatedUser({ uid: '123', email: 'test@example.com', displayName: 'Test User' })
    mockUrlChatId(null)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) })
    render(<ChatPage />)
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  it('shows user email if displayName is not available', async () => {
    mockAuthenticatedUser({ uid: '123', email: 'test@example.com', displayName: null })
    mockUrlChatId(null)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) })
    render(<ChatPage />)
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  it('allows the user to type and send a message (creates new chat first)', async () => {
    mockAuthenticatedUser()
    mockUrlChatId(null)

    // First, no chats exist
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chats: [] }),
    })

    // When user sends message, it will create a new chat
    const newChatId = 'new-chat-id'
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chat: { id: newChatId, title: 'New Chat', userId: '123', createdAt: {}, updatedAt: {} } }),
    })

    // Then send message to that chat
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "Hello! I'm your AI assistant. How can I help today?" }),
    })

    // After first message, it will refresh chats to get title
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chats: [{ id: newChatId, title: 'AI Chat Title', userId: '123', createdAt: {}, updatedAt: {} }] }),
    })

    render(<ChatPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/chats",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer fake-token' }) })
      )
    })

    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByRole('button', { name: /send/i })

    fireEvent.change(input, { target: { value: 'Hello, AI!' } })

    await act(async () => {
      fireEvent.click(sendButton)
    })

    await waitFor(() => {
      expect(
        screen.getByText("Hello! I'm your AI assistant. How can I help today?")
      ).toBeInTheDocument()
    })
  })

  it('sends message on Enter key', async () => {
    mockAuthenticatedUser()
    mockUrlChatId(null)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) })
    const newChatId = 'new-chat-id'
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chat: { id: newChatId, title: 'New Chat', userId: '123', createdAt: {}, updatedAt: {} } }) })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ reply: "Hello!" }) })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [{ id: newChatId, title: 'Hello', userId: '123', createdAt: {}, updatedAt: {} }] }) })

    render(<ChatPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/chats", expect.any(Object))
    })

    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'Enter message' } })

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    })

    await waitFor(() => {
      expect(screen.getByText("Hello!")).toBeInTheDocument()
    })
  })

  it('does not send empty message', async () => {
    await renderWithHistory()
    const sendButton = screen.getByRole('button', { name: /send/i })
    await act(async () => {
      fireEvent.click(sendButton)
    })
    expect(document.querySelector('.bg-indigo-100')).toBeNull()
  })

  it('displays AI response after fetch resolves', async () => {
    mockAuthenticatedUser()
    mockUrlChatId(null)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) })
    const newChatId = 'new-chat-id'
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chat: { id: newChatId, title: 'New Chat', userId: '123', createdAt: {}, updatedAt: {} } }) })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ reply: "Hello! I'm your AI assistant." }) })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [{ id: newChatId, title: 'AI', userId: '123', createdAt: {}, updatedAt: {} }] }) })

    render(<ChatPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'Hi' } })

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    })

    await waitFor(() => {
      expect(screen.getByText("Hello! I'm your AI assistant.")).toBeInTheDocument()
    })
  })

  it('disables send button while loading', async () => {
    mockAuthenticatedUser()
    mockUrlChatId(null)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) })
    const newChatId = 'new-chat-id'
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chat: { id: newChatId, title: 'New Chat', userId: '123', createdAt: {}, updatedAt: {} } }) })
    
    let resolveResponse: (value: { ok: boolean; json: () => Promise<{ reply: string }> }) => void = () => {} // Initialize with empty function
    const slowPromise = new Promise((resolve) => {
      resolveResponse = resolve
    })
    mockFetch.mockResolvedValueOnce(slowPromise)

    render(<ChatPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/chats", expect.any(Object))
    })

    const sendButton = screen.getByRole('button', { name: /send/i })
    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'Test' } })

    await act(async () => {
      fireEvent.click(sendButton)
    })

    // Button should be disabled while loading
    expect(sendButton).toBeDisabled()

    // Resolve the slow promise to clean up
    resolveResponse({ ok: true, json: async () => ({ reply: "Hello" }) })
  })

  it('disables send button when input is empty or whitespace', async () => {
    await renderWithHistory()
    const sendButton = screen.getByRole('button', { name: /send/i })
    const input = screen.getByPlaceholderText('Type your message...')
    expect(sendButton).toBeDisabled()
    fireEvent.change(input, { target: { value: '   ' } })
    expect(sendButton).toBeDisabled()
    fireEvent.change(input, { target: { value: 'Hello' } })
    expect(sendButton).not.toBeDisabled()
    fireEvent.change(input, { target: { value: '' } })
    expect(sendButton).toBeDisabled()
  })

  it('scrolls to bottom when messages update', async () => {
    mockAuthenticatedUser()
    mockUrlChatId(null)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) })
    const newChatId = 'new-chat-id'
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chat: { id: newChatId, title: 'New Chat', userId: '123', createdAt: {}, updatedAt: {} } }) })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ reply: "Hello!" }) })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [{ id: newChatId, title: 'Hello', userId: '123', createdAt: {}, updatedAt: {} }] }) })

    render(<ChatPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    mockScrollIntoView.mockClear()

    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'Scroll test' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send/i }))
    })

    // Wait for the message to appear and the scroll to be called
    await waitFor(() => {
      expect(screen.getByText("Hello!")).toBeInTheDocument()
    })
    // Additional small delay to ensure scroll effect runs
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(mockScrollIntoView).toHaveBeenCalled()
  })

  it('renders messages with correct styling based on role', async () => {
    mockAuthenticatedUser()
    mockUrlChatId(null)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [] }) })
    const newChatId = 'new-chat-id'
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chat: { id: newChatId, title: 'New Chat', userId: '123', createdAt: {}, updatedAt: {} } }) })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ reply: "Hello! I'm your AI assistant." }) })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ chats: [{ id: newChatId, title: 'AI', userId: '123', createdAt: {}, updatedAt: {} }] }) })

    render(<ChatPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'User message' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send/i }))
    })

    await waitFor(() => {
      const aiMsg = screen.getByText("Hello! I'm your AI assistant.")
      expect(aiMsg).toHaveClass('bg-white')
    })
  })

  it('redirects to login if not authenticated', async () => {
    const routerPush = jest.fn()
    const routerReplace = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ push: routerPush, replace: routerReplace })
    mockUnauthenticatedUser()
    mockUrlChatId(null)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [] }) })

    render(<ChatPage />)

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith('/auth/login')
    })
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/chats'))
  })
})