import { ChatRepository } from "./chat.repository";
import { generateAIResponse } from "@/app/lib/gemini";

export class ChatService {
  private chatRepository: ChatRepository;

  constructor() {
    this.chatRepository = new ChatRepository();
  }

  async createNewChat(userId: string): Promise<string> {
    const title = "New Chat";
    const chatId = await this.chatRepository.createChat(userId, title);
    return chatId;
  }

  async getUserChats(userId: string) {
    return await this.chatRepository.getUserChats(userId);
  }

  async sendUserMessage(userId: string, chatId: string, content: string) {
    await this.chatRepository.addMessage(chatId, userId, content, "user");

    const messages = await this.chatRepository.getMessages(chatId, userId);

    const formattedPrompt = `
You are a professional, helpful AI assistant.
Be concise, clear, and accurate.

${messages
  .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
  .join("\n")}
`;

    const aiReply = await generateAIResponse(formattedPrompt);

    await this.chatRepository.addMessage(chatId, userId, aiReply, "assistant");

    const chat = (await this.chatRepository.getUserChats(userId)).find(c => c.id === chatId);
    if (chat && chat.title === "New Chat" && messages.length === 0) {
      const titlePrompt = `Generate a short title (max 5 words) for this conversation: ${content}`;
      const title = await generateAIResponse(titlePrompt);
      await this.chatRepository.updateChatTitle(chatId, userId, title);
    }

    return aiReply;
  }

  async getChatHistory(userId: string, chatId: string) {
    return await this.chatRepository.getMessages(chatId, userId);
  }
}