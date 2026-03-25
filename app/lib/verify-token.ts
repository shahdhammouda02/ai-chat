import { getAuth } from "firebase-admin/auth";

export async function verifyFirebaseToken(token: string) {
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded;
  } catch (error) {
    throw new Error("Unauthorized");
  }
}