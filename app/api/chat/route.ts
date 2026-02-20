export const runtime = "nodejs";

import { sendMessageSchema } from "@/app/modules/chat/chat.schema";
import { NextResponse } from "next/server";
import { ChatService } from "@/app/modules/chat/chat.service";

const chatService = new ChatService();

export async function POST(req: Request) {
  try {
    const body = await req.json();
     const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { userId, content } = parsed.data;

    const reply = await chatService.sendUserMessage(userId, content);

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
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