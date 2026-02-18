import { NextResponse } from "next/server";
import { db } from "@/app/lib/firebase-admin";

export async function GET() {
  try {
    const snapshot = await db.collection("users").limit(5).get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Firebase API error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
