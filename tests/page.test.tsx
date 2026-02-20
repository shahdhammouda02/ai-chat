import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ChatPage from '@/app/page'

// Mock scrollIntoView
const mockScrollIntoView = jest.fn()
window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView

describe('ChatPage', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockScrollIntoView.mockClear()
  })

  afterEach(() => {
    // Wrap timer cleanup in act to avoid warnings about state updates
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
  })

  it('renders the chat header and input', () => {
    render(<ChatPage />)
    expect(screen.getByText('AI Chat')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('allows the user to type and send a message', () => {
    render(<ChatPage />)

    const input = screen.getByPlaceholderText('Type your message...')
    const sendButton = screen.getByRole('button', { name: /send/i })

    fireEvent.change(input, { target: { value: 'Hello, AI!' } })
    expect(input).toHaveValue('Hello, AI!')

    fireEvent.click(sendButton)

    expect(screen.getByText('Hello, AI!')).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(screen.getByText('AI is typing...')).toBeInTheDocument()
  })

  it('sends message on Enter key', () => {
    render(<ChatPage />)

    const input = screen.getByPlaceholderText('Type your message...')

    fireEvent.change(input, { target: { value: 'Enter message' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(screen.getByText('Enter message')).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(screen.getByText('AI is typing...')).toBeInTheDocument()
  })

  it('does not send empty message', () => {
    render(<ChatPage />)

    const sendButton = screen.getByRole('button', { name: /send/i })
    fireEvent.click(sendButton)

    // No user message should appear (class for user message is bg-indigo-100)
    expect(document.querySelector('.bg-indigo-100')).toBeNull()
    // No loading indicator
    expect(screen.queryByText('AI is typing...')).not.toBeInTheDocument()
  })

  it('displays AI response after simulated delay', async () => {
    render(<ChatPage />)

    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'Hi' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(screen.getByText('Hi')).toBeInTheDocument()
    expect(screen.getByText('AI is typing...')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.queryByText('AI is typing...')).not.toBeInTheDocument()
    })

    expect(screen.getByText("Hello! I'm your AI assistant. How can I help today?")).toBeInTheDocument()
  })

  it('disables send button while loading', async () => {
    render(<ChatPage />)

    const sendButton = screen.getByRole('button', { name: /send/i })
    const input = screen.getByPlaceholderText('Type your message...')

    fireEvent.change(input, { target: { value: 'Test' } })
    fireEvent.click(sendButton)

    expect(sendButton).toBeDisabled()

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(sendButton).not.toBeDisabled()
    })
  })

  it('scrolls to bottom when messages update', async () => {
    render(<ChatPage />)

    // Clear the initial scroll caused by useEffect on mount
    mockScrollIntoView.mockClear()

    // Add a user message
    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'Scroll test' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    // After user message, scroll should be called once
    expect(mockScrollIntoView).toHaveBeenCalledTimes(1)
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })

    // Fast-forward timer to get AI response
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Wait for AI message to appear and trigger another scroll
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalledTimes(2)
    })
  })

  it('renders messages with correct styling based on role', () => {
    render(<ChatPage />)

    const input = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(input, { target: { value: 'User message' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    const userMsg = screen.getByText('User message')
    expect(userMsg).toHaveClass('bg-indigo-100')

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    const aiMsg = screen.getByText("Hello! I'm your AI assistant. How can I help today?")
    expect(aiMsg).toHaveClass('bg-white')
  })
})