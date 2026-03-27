import { Timestamp } from "firebase-admin/firestore";

export type ChatMessage = {
  id?: string;
  content: string;
  role: "user" | "assistant";
  createdAt?: Timestamp;
};

export type Chat = {
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
