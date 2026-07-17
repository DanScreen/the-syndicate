import {
  createMobileToken,
  verifyMobileToken,
} from "@/lib/mobile-token";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  try {
    const user = await verifyMobileToken(token);
    // Persistent sessions need no rotation. Legacy JWTs are upgraded once.
    const persistentToken = token.startsWith("ms_")
      ? token
      : await createMobileToken(user);
    return NextResponse.json({ token: persistentToken });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
