import { db } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export class ChatRepository {
  async createMessage(data: {
    userId: string;
    content: string;
    role: "user" | "assistant";
  }) {
    await db.collection("messages").add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  async getMessages(userId: string) {
    const snapshot = await db
      .collection("messages")
      .where("userId", "==", userId)
      .orderBy("createdAt", "asc")
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }
}