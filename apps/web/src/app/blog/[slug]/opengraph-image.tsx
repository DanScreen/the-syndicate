import { BRAND_COLORS } from "@tiki-acca/shared";
import { RondoDiscMark } from "@/lib/brand/rondo-icon";
import { getAllPosts, getPost } from "@/lib/blog";
import { ImageResponse } from "next/og";

export const alt = "Tiki Acca blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pre-render one image per post at build time (blog is fully static).
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  const title = post?.title ?? "Tiki Acca";
  const kicker = (post?.tags?.[0] ?? "Tiki Acca blog").toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BRAND_COLORS.background,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <RondoDiscMark size={84} />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: BRAND_COLORS.foreground }}>
            Tiki <span style={{ color: BRAND_COLORS.accent, marginLeft: 10 }}>Acca</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: 4,
              color: BRAND_COLORS.accent,
              marginBottom: 24,
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.1,
              color: BRAND_COLORS.foreground,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: BRAND_COLORS.muted }}>
          Your Mates. One Acca. Every Leg Counts.
        </div>
      </div>
    ),
    { ...size }
  );
}
