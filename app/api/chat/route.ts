export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ChatService } from "@/app/modules/chat/chat.service";

const chatService = new ChatService();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, content } = body;

    await chatService.sendUserMessage(userId, content);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("POST /api/chat error:", error);
    const message = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const messages = await chatService.getChatHistory(userId);

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    console.error("GET /api/chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch messages" },
      { status: 500 }
    );
  }
}