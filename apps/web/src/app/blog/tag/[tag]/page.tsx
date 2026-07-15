import { MarketingShell } from "@/components/marketing/marketing-shell";
import { formatPostDate, getAllTags, getPostsByTag } from "@/lib/blog";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = { params: Promise<{ tag: string }> };

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag } = await params;
  const { label, posts } = getPostsByTag(tag);
  if (posts.length === 0) return {};
  return {
    title: `${label} — Tiki Acca blog`,
    description: `Tiki Acca posts tagged “${label}”: accas and group betting, explained properly.`,
    alternates: { canonical: `/blog/tag/${tag}` },
  };
}

export default async function BlogTagPage({ params }: Params) {
  const { tag } = await params;
  const { label, posts } = getPostsByTag(tag);
  if (posts.length === 0) notFound();

  return (
    <MarketingShell path={`/blog/tag/${tag}`}>
      <div className="marketing-gradient border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <Link href="/blog" className="text-sm text-accent hover:underline">
            ← All posts
          </Link>
          <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-accent">Tag</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">
            {label}
          </h1>
          <p className="mt-4 text-lg text-muted">
            {posts.length} post{posts.length === 1 ? "" : "s"} tagged “{label}”.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="block rounded-2xl border border-border bg-card p-6 transition-colors hover:border-accent/40"
              >
                <p className="text-xs text-muted">
                  {formatPostDate(post.date)} · {post.readingMinutes} min read
                </p>
                <h2 className="mt-2 font-display text-xl font-semibold">{post.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{post.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingShell>
  );
}
