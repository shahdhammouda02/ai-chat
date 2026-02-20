import { ChatRepository } from "./chat.repository";

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
  }

  async getChatHistory(userId: string) {
    return await this.chatRepository.getMessages(userId);
  }
}