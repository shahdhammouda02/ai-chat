import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/app/lib/verify-token";
import { ChatRepository } from "@/app/modules/chat/chat.repository";

const chatRepository = new ChatRepository();

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.split("Bearer ")[1];
    const decoded = await verifyFirebaseToken(token);
    const userId = decoded.uid;

    // Use the repository directly to fetch all chats for the user
    const chats = await chatRepository.getUserChats(userId);
    return NextResponse.json({ chats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.split("Bearer ")[1];
    const decoded = await verifyFirebaseToken(token);
    const userId = decoded.uid;

    // Create a new chat via the repository
    const chatId = await chatRepository.createChat(userId, "New Chat");

    const chat = {
      id: chatId,
      title: "New Chat",
      userId,
    };

    return NextResponse.json({ chat });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
  }
}