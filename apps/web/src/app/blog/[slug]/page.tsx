import { MarketingShell } from "@/components/marketing/marketing-shell";
import { formatPostDate, getAllPosts, getPost, tagSlug } from "@/lib/blog";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { ComponentPropsWithoutRef } from "react";

const SITE = "https://www.tikiacca.com";

type Params = { params: Promise<{ slug: string }> };

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    // Canonical prevents duplicate-URL dilution (trailing slash, query params).
    // Resolved against metadataBase in layout.tsx.
    alternates: { canonical: url },
    authors: [{ name: post.author }],
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors: [post.author],
      tags: post.tags,
      url,
    },
    // og:image is supplied automatically by opengraph-image.tsx in this segment.
  };
}

/** Styled MDX elements — Turf Green prose without a typography plugin. */
const mdxComponents = {
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="mt-10 font-display text-2xl font-bold tracking-tight" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-8 font-display text-xl font-semibold" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mt-4 leading-relaxed text-muted" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-muted" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6 text-muted" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="leading-relaxed" {...props} />
  ),
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a className="text-accent underline-offset-2 hover:underline" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: (props: ComponentPropsWithoutRef<"em">) => <em {...props} />,
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="mt-4 rounded-xl border border-accent/30 bg-accent-muted/20 px-5 py-3 font-medium text-foreground"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-border" />,
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code className="rounded bg-card px-1.5 py-0.5 text-sm text-accent" {...props} />
  ),
};

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const url = `${SITE}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated,
    author: { "@type": "Organization", name: post.author, url: SITE },
    publisher: {
      "@type": "Organization",
      name: "Tiki Acca",
      logo: { "@type": "ImageObject", url: `${SITE}/icon.svg` },
    },
    image: `${url}/opengraph-image`,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: (post.tags ?? []).join(", "),
    isAccessibleForFree: true,
  };

  return (
    <MarketingShell path={`/blog/${post.slug}`}>
      {/* BlogPosting structured data for rich results. */}
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="marketing-gradient border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-14 md:py-18">
          <Link href="/blog" className="text-sm text-accent hover:underline">
            ← All posts
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {post.title}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {formatPostDate(post.date)} · {post.readingMinutes} min read · {post.author}
          </p>
          {post.tags && post.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog/tag/${tagSlug(tag)}`}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
                >
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-10">
        <MDXRemote source={post.content} components={mdxComponents} />

        <div className="mt-14 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-display text-lg font-semibold">
            One leg each. Best odds locked. Bragging rights forever.
          </p>
          <Link
            href="/sign-up"
            className="mt-4 inline-block rounded-xl bg-accent px-6 py-2.5 font-medium text-on-accent transition-colors hover:bg-accent-bright"
          >
            Start a group. Free.
          </Link>
        </div>
      </article>
    </MarketingShell>
  );
}
