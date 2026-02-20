import {z} from "zod";

export const sendMessageSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  content: z.string().min(1, "Message content cannot be empty"),
});