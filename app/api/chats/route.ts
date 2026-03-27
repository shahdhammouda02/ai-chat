import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/app/lib/verify-token";
import { ChatService } from "@/app/modules/chat/chat.service";

const chatService = new ChatService();

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.split("Bearer ")[1];
    const decoded = await verifyFirebaseToken(token);
    const userId = decoded.uid;

    const chats = await chatService.getUserChats(userId);
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

    const chatId = await chatService.createNewChat(userId);
    const chats = await chatService.getUserChats(userId);
    const chat = chats.find(c => c.id === chatId);
    return NextResponse.json({ chat });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
  }
}