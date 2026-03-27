import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/app/lib/verify-token";
import { ChatService } from "@/app/modules/chat/chat.service";

const chatService = new ChatService();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.split("Bearer ")[1];
    const decoded = await verifyFirebaseToken(token);
    const userId = decoded.uid;

    // await params
    const { chatId } = await params;

    const body = await req.json();
    const { content } = body;
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    const reply = await chatService.sendUserMessage(userId, chatId, content);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
