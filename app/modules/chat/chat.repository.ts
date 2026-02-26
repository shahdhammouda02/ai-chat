import { db } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { ChatMessage } from "./chat.types";

export class ChatRepository {
  async createMessage(data: {
    sessionId: string;
    content: string;
    role: "user" | "assistant";
  }) {
    await db
      .collection("chatSessions")
      .doc(data.sessionId)
      .collection("messages")
      .add({
        content: data.content,
        role: data.role,
        createdAt: FieldValue.serverTimestamp(),
      });
  }

   async getMessages(sessionId: string) {
    const snapshot = await db
      .collection("chatSessions")
      .doc(sessionId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

   return snapshot.docs.map((doc) => {
  const data = doc.data() as Omit<ChatMessage, "id">;

  return {
    id: doc.id,
    ...data,
  };
});
  }
}