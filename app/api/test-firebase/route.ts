import { NextResponse } from "next/server";
import { db } from "@/app/lib/firebase-admin"

export async function GET() {
  await db.collection("test").add({
    message: "Firebase connected!",
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true });
}
