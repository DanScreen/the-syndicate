import { randomBytes } from "node:crypto";
import { prisma, type Prisma } from "@tiki-acca/database";
import { MAX_AVATAR_UPLOAD_BYTES } from "@tiki-acca/shared";
import sharp from "sharp";

/**
 * Profile-picture storage, shared by the web Account page and the app (both go
 * through `/api/user/avatar`).
 *
 * Pictures live in Postgres (`UserAvatar`), not a bucket: once re-encoded they
 * are ~10–20 KB each, so a database row means no new infrastructure, and
 * backups and account deletion cover them for free. The serving route caches
 * each URL forever, so a picture is read from the database about once per
 * viewer.
 *
 * Every upload is decoded and re-encoded server-side, whatever the client did
 * first. That makes the stored file small and square, rejects anything that
 * isn't really an image, and drops EXIF metadata — a phone photo's GPS
 * position would otherwise be handed to every group member.
 */

/** Stored pictures are this many pixels square — 2–3× the largest display size. */
export const AVATAR_SIZE = 256;

export type AvatarResult =
  | { ok: true; avatarKey: string }
  | { ok: false; error: string; status: 400 | 413 };

/**
 * Photo formats accepted. Anything else libvips could decode (SVG, PDF, TIFF…)
 * is refused, to keep the decoder surface to ordinary photos.
 */
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "heif", "avif"]);

/** Decode, square-crop, resize and re-encode an upload. Null if it isn't an image. */
export async function normaliseAvatar(input: Buffer): Promise<Buffer | null> {
  try {
    const { format } = await sharp(input).metadata();
    if (!format || !ACCEPTED_FORMATS.has(format)) return null;
    return await sharp(input, {
      // Refuse decompression bombs: 50 megapixels is above any phone camera.
      limitInputPixels: 50_000_000,
      // Animated GIF/WebP: take the first frame only.
      pages: 1,
    })
      .rotate() // honour the EXIF orientation before it's stripped
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return null;
  }
}

/** Replace the user's picture. The new key makes a new URL, so caches never serve the old one. */
export async function saveAvatar(userId: string, input: Buffer): Promise<AvatarResult> {
  if (input.length === 0) {
    return { ok: false, error: "Choose a picture to upload.", status: 400 };
  }
  if (input.length > MAX_AVATAR_UPLOAD_BYTES) {
    return { ok: false, error: "That picture is too large. The limit is 8 MB.", status: 413 };
  }
  const encoded = await normaliseAvatar(input);
  if (!encoded) {
    return {
      ok: false,
      error: "That file isn't a picture we can read. Try a JPEG or PNG.",
      status: 400,
    };
  }

  const image = new Uint8Array(encoded);
  const avatarKey = randomBytes(18).toString("base64url");
  await prisma.$transaction([
    prisma.userAvatar.upsert({
      where: { userId },
      create: { userId, image },
      update: { image },
    }),
    prisma.user.update({ where: { id: userId }, data: { avatarKey } }),
  ]);
  return { ok: true, avatarKey };
}

/** Go back to initials. */
export async function removeAvatar(
  userId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<void> {
  await tx.userAvatar.deleteMany({ where: { userId } });
  await tx.user.update({ where: { id: userId }, data: { avatarKey: null } });
}
