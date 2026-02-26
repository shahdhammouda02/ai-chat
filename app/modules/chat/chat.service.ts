import { ChatRepository } from "./chat.repository";
import { generateAIResponse } from "@/app/lib/gemini";

export class ChatService {
  private chatRepository: ChatRepository;

  constructor() {
    this.chatRepository = new ChatRepository();
  }

  async sendUserMessage(sessionId: string, content: string) {
    await this.chatRepository.createMessage({
      sessionId,
      content,
      role: "user",
    });

    const history = await this.chatRepository.getMessages(sessionId);
    const limitedHistory = history.slice(-10);

    const formattedPrompt = `
You are a professional, helpful AI assistant.
Be concise, clear, and accurate.

${limitedHistory
  .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
  .join("\n")}
`;

    const aiReply = await generateAIResponse(formattedPrompt);

    await this.chatRepository.createMessage({
      sessionId,
      content: aiReply,
      role: "assistant",
    });

    return aiReply;
  }

  async getChatHistory(sessionId: string) {
    return await this.chatRepository.getMessages(sessionId);
  }

  // private async generateAIReply(content: string): Promise<string> {
  //   return `You said: "${content}". This is a mock AI response.`;
  // }
}
