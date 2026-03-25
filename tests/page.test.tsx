import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

// Mock firebase/auth first (before any imports that use it)
jest.mock('firebase/auth', () => ({
  signOut: jest.fn(() => Promise.resolve()),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
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

// Import the mocked modules after mocks are defined
import { useAuth } from '@/app/hooks/useAuth'
import { useRouter } from 'next/navigation'

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
const mockAuthenticatedUser = (user = { uid: '123', email: 'test@example.com', displayName: 'Test User' }) => {
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

const renderWithHistory = async () => {
  mockAuthenticatedUser()
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ messages: [] }),
  })

  render(<ChatPage />)

  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat?sessionId=test-session-id",
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
    ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })
  })

  it('renders the chat header and input', async () => {
    await renderWithHistory()
    expect(screen.getByText('AI Chat')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('shows user name in header', async () => {
    mockAuthenticatedUser({ uid: '123', email: 'test@example.com', displayName: 'Test User' })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    })
    render(<ChatPage />)
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  it('shows user email if displayName is not available', async () => {
    mockAuthenticatedUser({ uid: '123', email: 'test@example.com', displayName: "" })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    })
    render(<ChatPage />)
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  it('allows the user to type and send a message', async () => {
    mockAuthenticatedUser()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: "Hello! I'm your AI assistant. How can I help today?",
        }),
      })

    render(<ChatPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/chat?sessionId=test-session-id",
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
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: "Hello! I'm your AI assistant. How can I help today?",
        }),
      })

    render(<ChatPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'Enter message' } })

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    })

    await waitFor(() => {
      expect(
        screen.getByText("Hello! I'm your AI assistant. How can I help today?")
      ).toBeInTheDocument()
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
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: "Hello! I'm your AI assistant. How can I help today?",
        }),
      })

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
      expect(
        screen.getByText("Hello! I'm your AI assistant. How can I help today?")
      ).toBeInTheDocument()
    })
  })

  it('disables send button while loading', async () => {
    mockAuthenticatedUser()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: "Hello! I'm your AI assistant. How can I help today?",
        }),
      })

    render(<ChatPage />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    const sendButton = screen.getByRole('button', { name: /send/i })
    const input = screen.getByPlaceholderText('Type your message...')

    fireEvent.change(input, { target: { value: 'Test' } })

    await act(async () => {
      fireEvent.click(sendButton)
    })

    await waitFor(() => {
      expect(sendButton).toBeDisabled()
    })
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
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: "Hello! I'm your AI assistant. How can I help today?",
        }),
      })

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

    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalled()
    })
  })

  it('renders messages with correct styling based on role', async () => {
    mockAuthenticatedUser()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: "Hello! I'm your AI assistant. How can I help today?",
        }),
      })

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
      const aiMsg = screen.getByText(
        "Hello! I'm your AI assistant. How can I help today?"
      )
      expect(aiMsg).toHaveClass('bg-white')
    })
  })

  it('redirects to login if not authenticated', async () => {
    const routerPush = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ push: routerPush })
    mockUnauthenticatedUser()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [] }) })

    render(<ChatPage />)

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith('/auth/login')
    })
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/chat'))
  })
})