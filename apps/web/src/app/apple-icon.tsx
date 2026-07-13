import { AccaStackMark } from "@/lib/brand/acca-stack-icon";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AccaStackMark size={180} />, {
    ...size,
  });
}
