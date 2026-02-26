import { ChatRepository } from "./chat.repository";
import { generateAIResponse } from "@/app/lib/gemini";

export class ChatService {
  private chatRepository: ChatRepository;

  constructor() {
    this.chatRepository = new ChatRepository();
  }

  async sendUserMessage(userId: string, content: string) {
    await this.chatRepository.createMessage({
      userId,
      content,
      role: "user",
    });

    const aiReply = await generateAIResponse(content);

    await this.chatRepository.createMessage({
      userId,
      content: aiReply,
      role: "assistant",
    });

    return aiReply;
  }

  async getChatHistory(userId: string) {
    return await this.chatRepository.getMessages(userId);
  }

  // private async generateAIReply(content: string): Promise<string> {
  //   return `You said: "${content}". This is a mock AI response.`;
  // }
}