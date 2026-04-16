import { ChatRepository } from "./chat.repository";
import { generateAIResponse } from "@/app/lib/gemini";

export class ChatService {
  private chatRepository: ChatRepository;
  private pendingTitleGenerations: Map<string, Promise<void>> = new Map();

  constructor() {
    this.chatRepository = new ChatRepository();
  }

  async createNewChat(userId: string): Promise<string> {
    const chatId = await this.chatRepository.createChat(userId, "New Chat");
    return chatId;
  }

  async renameChat(
    userId: string,
    chatId: string,
    title: string,
  ): Promise<void> {
    await this.ensureChatOwnership(userId, chatId);
    await this.chatRepository.updateChatTitle(chatId, userId, title);
  }

  async sendUserMessage(userId: string, chatId: string, content: string) {
    await this.ensureChatOwnership(userId, chatId);
    await this.chatRepository.addMessage(chatId, userId, content, "user");

    const messages = await this.chatRepository.getMessages(chatId, userId);
    const isFirstMessage = messages.length === 1;

    if (isFirstMessage) {
      // Check if title generation is already in progress for this chat
      const existingGeneration = this.pendingTitleGenerations.get(chatId);
      if (!existingGeneration) {
        const generationPromise = this.generateAndSetTitle(
          chatId,
          userId,
          content,
        );
        this.pendingTitleGenerations.set(chatId, generationPromise);

        try {
          await generationPromise;
        } finally {
          this.pendingTitleGenerations.delete(chatId);
        }
      }
    }

    const formattedPrompt = `You are a professional, helpful AI assistant with excellent formatting skills.

CRITICAL FORMATTING RULES:

1. **Bold Headers**: Use **bold text** (with double asterisks) for section headers. Make them stand out clearly.

2. **Emojis**: Add relevant emojis at the beginning of sections or bullet points when appropriate:
    📝 For tips/advice
    ✅ For positive points or completed items
    ⚠️ For warnings or important notes
    🎯 For goals or objectives
    📊 For statistics or data
    💡 For ideas or insights
    🔧 For tools or technical things
    📚 For learning resources
    🚀 For next steps or improvements
    ❌ For negative points or what to avoid

3. **Clean Bullet Points**: Use "•" or "-" WITHOUT asterisks. Keep them simple and clean.

4. **Consistent Spacing**: 
   - Use double line breaks (\\n\\n) between sections
   - Single line break after headers
   - Single line break between bullet points

5. **No Extra Symbols**: Do NOT use asterisks (*) for bullet points. Do NOT use random symbols.

FORMATTING EXAMPLE:

**📝 Quick Tips for Success**
Here are the key points to remember:

• Start with clear goals
• Take consistent action
• Track your progress

**✅ What You'll Gain**
By following this advice, you will:

• Save time and effort
• Achieve better results
• Build lasting habits

**🚀 Next Steps**
Ready to begin? Here's what to do:

1. Write down your main objective
2. Create a simple action plan
3. Take the first step today

CONVERSATION HISTORY:
${messages
  .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
  .join("\n")}

Assistant: Now provide your response following these formatting rules. Use bold headers, appropriate emojis, clean bullet points, and consistent spacing.`;

    const aiReply = await generateAIResponse(formattedPrompt);
    await this.chatRepository.addMessage(chatId, userId, aiReply, "assistant");

    return aiReply;
  }

  private async generateAndSetTitle(
    chatId: string,
    userId: string,
    firstMessage: string,
  ): Promise<void> {
    const titlePrompt = `Generate a short title (max 5 words) for this conversation based on this message: "${firstMessage}". Reply with only the title, no quotes.`;
    const title = await generateAIResponse(titlePrompt);
    await this.chatRepository.updateChatTitle(chatId, userId, title);
  }

  async getChatHistory(userId: string, chatId: string) {
    await this.ensureChatOwnership(userId, chatId);
    return await this.chatRepository.getMessages(chatId, userId);
  }

  private async ensureChatOwnership(
    userId: string,
    chatId: string,
  ): Promise<void> {
    const chat = await this.chatRepository.getChat(chatId, userId);
    if (!chat) {
      throw new Error("Chat not found or access denied");
    }
  }
}
