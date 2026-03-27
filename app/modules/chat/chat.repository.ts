import { db } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { ChatMessage, Chat } from "./chat.types";

export class ChatRepository {
  async createChat(userId: string, title: string): Promise<string> {
    const chatRef = db.collection("users").doc(userId).collection("chats").doc();
    await chatRef.set({
      userId,
      title,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return chatRef.id;
  }

  async getUserChats(userId: string): Promise<Chat[]> {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("chats")
      .orderBy("updatedAt", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Chat[];
  }

  async updateChatTitle(chatId: string, userId: string, title: string): Promise<void> {
    await db
      .collection("users")
      .doc(userId)
      .collection("chats")
      .doc(chatId)
      .update({ title, updatedAt: FieldValue.serverTimestamp() });
  }

  async addMessage(chatId: string, userId: string, content: string, role: "user" | "assistant"): Promise<void> {
    await db
      .collection("users")
      .doc(userId)
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .add({
        content,
        role,
        createdAt: FieldValue.serverTimestamp(),
      });
    // Update chat's updatedAt
    await db
      .collection("users")
      .doc(userId)
      .collection("chats")
      .doc(chatId)
      .update({ updatedAt: FieldValue.serverTimestamp() });
  }

  async getMessages(chatId: string, userId: string): Promise<ChatMessage[]> {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data() as Omit<ChatMessage, "id">;
      return { id: doc.id, ...data };
    });
  }
}