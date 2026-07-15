import { MarketingShell } from "@/components/marketing/marketing-shell";
import { formatPostDate, getAllPosts } from "@/lib/blog";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides and product news from Tiki Acca — accas explained, group betting done properly, and what we're building.",
};

export const dynamic = "force-static";

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <MarketingShell path="/blog">
      <div className="marketing-gradient border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">Blog</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Guides &amp; news
          </h1>
          <p className="mt-4 text-lg text-muted">
            Accas explained properly, and what we&apos;re building. No tips — ever.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12">
        {posts.length === 0 ? (
          <p className="text-muted">No posts yet — check back soon.</p>
        ) : (
          <ul className="space-y-6">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="block rounded-2xl border border-border bg-card p-6 transition-colors hover:border-accent/40"
                >
                  <p className="text-xs text-muted">
                    {formatPostDate(post.date)} · {post.readingMinutes} min read
                    {post.draft ? " · DRAFT" : ""}
                  </p>
                  <h2 className="mt-2 font-display text-xl font-semibold">{post.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{post.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MarketingShell>
  );
}
