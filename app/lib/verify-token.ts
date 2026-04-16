import { getAuth } from "firebase-admin/auth";

export async function verifyFirebaseToken(token: string) {
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    throw new Error("Unauthorized");
  }
}