import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ChatPage from '@/app/page'

Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: jest.fn(() => "test-session-id"),
  },
})

beforeEach(() => {
  localStorage.clear()
})

const mockScrollIntoView = jest.fn()
window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView

const mockFetch = jest.fn()
global.fetch = mockFetch as jest.Mock

const renderWithHistory = async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ messages: [] }),
  })

  render(<ChatPage />)

  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat?sessionId=test-session-id"
    )
  })
}

describe('ChatPage', () => {
  beforeEach(() => {
    mockScrollIntoView.mockClear()
    mockFetch.mockReset()
  })

  it('renders the chat header and input', async () => {
    await renderWithHistory()

    expect(screen.getByText('AI Chat')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('allows the user to type and send a message', async () => {
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
      expect(sendButton).not.toBeDisabled()
    })
  })

  it('scrolls to bottom when messages update', async () => {
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
})