import {z} from "zod";

export const sendMessageSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  content: z.string().min(1, "Message content cannot be empty"),
});