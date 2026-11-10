import { prisma } from "@tiki-acca/database";
import { greyscaleAvatar } from "@/lib/avatar-upload";

/**
 * Serves a profile picture by its key (`User.avatarKey`).
 *
 * Deliberately not behind sign-in, so the app's <Image> and the web's <img>
 * can load it like any other picture with no auth headers. The key is 144
 * random bits, so a URL can only be found by someone it was shown to (a group
 * member), and it stops working as soon as the picture is replaced or removed.
 * Each key's bytes never change, so the response is cached forever.
 *
 * `?mono=1` returns a greyscale copy: the app shows it, faded, for members who
 * haven't picked yet (the web greyscales the normal picture with CSS).
 */
export async function GET(request: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const user = await prisma.user.findUnique({
    where: { avatarKey: key },
    select: { avatar: { select: { image: true } } },
  });
  if (!user?.avatar) return new Response("Not found", { status: 404 });

  const stored = Buffer.from(user.avatar.image);
  const mono = new URL(request.url).searchParams.get("mono") === "1";
  const body = mono ? await greyscaleAvatar(stored) : stored;

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
