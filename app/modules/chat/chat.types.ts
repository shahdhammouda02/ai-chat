
export type ChatMessage = {
  id?: string;
  content: string;
  role: "user" | "assistant";
  createdAt?: Date | {seconds: number; nanoseconds: number};
};

export type Chat = {
  id: string;
  userId: string;
  title: string;
  createdAt: Date | {seconds: number; nanoseconds: number};
  updatedAt: Date | {seconds: number; nanoseconds: number};
};
