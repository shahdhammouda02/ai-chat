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

  async renameChat(userId: string, chatId: string, title: string): Promise<void> {
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
        const generationPromise = this.generateAndSetTitle(chatId, userId, content);
        this.pendingTitleGenerations.set(chatId, generationPromise);
        
        try {
          await generationPromise;
        } finally {
          this.pendingTitleGenerations.delete(chatId);
        }
      }
  }

  const formattedPrompt = `
You are a professional, helpful AI assistant.
Be concise, clear, and accurate.

${messages
  .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
  .join("\n")}
`;

  const aiReply = await generateAIResponse(formattedPrompt);
  await this.chatRepository.addMessage(chatId, userId, aiReply, "assistant");

  return aiReply;
}

  private async generateAndSetTitle(chatId: string, userId: string, firstMessage: string): Promise<void> {
    const titlePrompt = `Generate a short title (max 5 words) for this conversation based on this message: "${firstMessage}". Reply with only the title, no quotes.`;
    const title = await generateAIResponse(titlePrompt);
    await this.chatRepository.updateChatTitle(chatId, userId, title);
  }

  async getChatHistory(userId: string, chatId: string) {
    await this.ensureChatOwnership(userId, chatId);
    return await this.chatRepository.getMessages(chatId, userId);
  }

  private async ensureChatOwnership(userId: string, chatId: string): Promise<void> {
    const chat = await this.chatRepository.getChat(chatId, userId);
    if (!chat) {
      throw new Error("Chat not found or access denied");
    }
  }
}
