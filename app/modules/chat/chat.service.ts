import { ChatRepository } from "./chat.repository";
import { generateAIResponse } from "@/app/lib/gemini";

export class ChatService {
  private chatRepository: ChatRepository;

  constructor() {
    this.chatRepository = new ChatRepository();
  }

  async createNewChat(userId: string): Promise<string> {
    const chatId = await this.chatRepository.createChat(userId, "New Chat");
    return chatId;
  }

  async renameChat(userId: string, chatId: string, title: string): Promise<void> {
  await this.chatRepository.updateChatTitle(chatId, userId, title);
}

  async sendUserMessage(userId: string, chatId: string, content: string) {
  await this.chatRepository.addMessage(chatId, userId, content, "user");

  const messages = await this.chatRepository.getMessages(chatId, userId);
  const isFirstMessage = messages.length === 1;

  if (isFirstMessage) {
    const titlePrompt = `Generate a short title (max 5 words) for this conversation based on this message: "${content}". Reply with only the title, no quotes.`;
    const title = await generateAIResponse(titlePrompt);
    await this.chatRepository.updateChatTitle(chatId, userId, title);
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

  async getChatHistory(userId: string, chatId: string) {
    return await this.chatRepository.getMessages(chatId, userId);
  }
}
