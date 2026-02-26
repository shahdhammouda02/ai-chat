export type ChatMessage = {
  id?: string;
  content: string;
  role: "user" | "assistant";
  createdAt?: FirebaseFirestore.Timestamp;
};