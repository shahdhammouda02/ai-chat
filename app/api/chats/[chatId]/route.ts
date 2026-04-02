import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/app/lib/verify-token";
import { db } from "@/app/lib/firebase-admin";
import { ChatService } from "@/app/modules/chat/chat.service";

const chatService = new ChatService();

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    const decoded = await verifyFirebaseToken(token);
    const userId = decoded.uid;
    const { chatId } = await params;

    // Delete chat document and all its messages
    const chatRef = db.collection("users").doc(userId).collection("chats").doc(chatId);
    const messagesRef = chatRef.collection("messages");
    const messagesSnapshot = await messagesRef.get();
    const batch = db.batch();
    messagesSnapshot.forEach((doc) => batch.delete(doc.ref));
    batch.delete(chatRef);
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    const decoded = await verifyFirebaseToken(token);
    const userId = decoded.uid;
    const { chatId } = await params;

    const body = await req.json();
    const { title } = body;
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    await chatService.renameChat(userId, chatId, title);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rename error:", error);
    return NextResponse.json({ error: "Failed to rename chat" }, { status: 500 });
  }
}