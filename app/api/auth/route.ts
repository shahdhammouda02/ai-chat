import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/app/lib/verify-token";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await verifyFirebaseToken(token);

    return NextResponse.json({
      user: {
        uid: decoded.uid,
        email: decoded.email,
      },
    });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}