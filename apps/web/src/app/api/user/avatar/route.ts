import { requireSession } from "@/lib/api-auth";
import { removeAvatar, saveAvatar } from "@/lib/avatar-upload";
import { avatarPath, MAX_AVATAR_UPLOAD_BYTES, type AvatarResponse } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

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

  // Refuse an oversized body before reading it. Base64 is 4 chars per 3 bytes,
  // plus a little room for the JSON or multipart wrapper.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > Math.ceil(MAX_AVATAR_UPLOAD_BYTES / 3) * 4 + 4096) {
    return NextResponse.json({ error: "That picture is too large. The limit is 8 MB." }, { status: 413 });
  }

  let bytes: Buffer;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const file = form?.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose a picture to upload." }, { status: 400 });
    }
    bytes = Buffer.from(await file.arrayBuffer());
  } else {
    const body = (await request.json().catch(() => null)) as { image?: unknown } | null;
    if (typeof body?.image !== "string" || body.image.length === 0) {
      return NextResponse.json({ error: "Send the picture as base64 in `image`." }, { status: 400 });
    }
    bytes = Buffer.from(body.image, "base64");
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
