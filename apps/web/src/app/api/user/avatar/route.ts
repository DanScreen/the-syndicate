import { requireSession } from "@/lib/api-auth";
import { removeAvatar, saveAvatar } from "@/lib/avatar-upload";
import { isRateLimited, retryAfterSeconds } from "@/lib/rate-limit";
import { avatarPath, MAX_AVATAR_UPLOAD_BYTES, type AvatarResponse } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

/** Largest request body read: an 8 MB picture as base64 JSON, plus wrapper room. */
const MAX_BODY_BYTES = Math.ceil(MAX_AVATAR_UPLOAD_BYTES / 3) * 4 + 64 * 1024;
/** Each upload is a full image decode and re-encode, so keep them occasional. */
const UPLOAD_LIMIT = 10;
const UPLOAD_WINDOW_MS = 10 * 60_000;

const TOO_LARGE = "That picture is too large. The limit is 8 MB.";

/**
 * Read the body, stopping as soon as it passes `limit`. Route handlers have no
 * built-in body cap and `content-length` can be missing or wrong, so count the
 * bytes as they arrive rather than trusting the header.
 */
async function readCappedBody(request: Request, limit: number): Promise<Buffer | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > limit) return null;
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * Set the signed-in user's profile picture. Accepts either multipart form data
 * with an `avatar` file (the website) or JSON `{ image: "<base64>" }` (the
 * app, whose image picker hands over base64 directly). Any common image
 * format; the server crops, resizes and re-encodes it. Returns `{ avatarUrl }`.
 */
export async function PUT(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const userId = session!.user.id;

  const limitKey = `avatar:${userId}`;
  if (isRateLimited(limitKey, UPLOAD_LIMIT, UPLOAD_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many picture changes. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(limitKey)) } }
    );
  }

  const raw = await readCappedBody(request, MAX_BODY_BYTES);
  if (!raw) return NextResponse.json({ error: TOO_LARGE }, { status: 413 });

  let bytes: Buffer;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await new Response(new Uint8Array(raw), {
      headers: { "content-type": contentType },
    })
      .formData()
      .catch(() => null);
    const file = form?.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose a picture to upload." }, { status: 400 });
    }
    bytes = Buffer.from(await file.arrayBuffer());
  } else {
    let body: { image?: unknown } | null = null;
    try {
      body = JSON.parse(raw.toString("utf8")) as { image?: unknown };
    } catch {
      body = null;
    }
    if (typeof body?.image !== "string" || body.image.length === 0) {
      return NextResponse.json({ error: "Send the picture as base64 in `image`." }, { status: 400 });
    }
    // Tolerate a data URL ("data:image/jpeg;base64,...") as well as bare base64.
    bytes = Buffer.from(body.image.replace(/^data:[^,]*;base64,/, ""), "base64");
  }

  const result = await saveAvatar(userId, bytes);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ avatarUrl: avatarPath(result.avatarKey) } satisfies AvatarResponse);
}

/** Remove the picture and go back to initials. */
export async function DELETE() {
  const { session, error } = await requireSession();
  if (error) return error;
  await removeAvatar(session!.user.id);
  return NextResponse.json({ avatarUrl: null } satisfies AvatarResponse);
}
