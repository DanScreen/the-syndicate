import { AccaStackMark } from "@/lib/brand/acca-stack-icon";
import { ImageResponse } from "next/og";

export const contentType = "image/png";

const SIZES = {
  small: 32,
  google: 48,
  large: 192,
} as const;

export function generateImageMetadata() {
  return Object.entries(SIZES).map(([id, size]) => ({
    id,
    contentType: "image/png" as const,
    size: { width: size, height: size },
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const iconId = (await id) as keyof typeof SIZES;
  const size = SIZES[iconId] ?? 32;

  return new ImageResponse(<AccaStackMark size={size} />, {
    width: size,
    height: size,
  });
}
