import { MarketingShell } from "@/components/marketing/marketing-shell";
import { formatPostDate, getAllPosts, getPost } from "@/lib/blog";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { ComponentPropsWithoutRef } from "react";

type Params = { params: Promise<{ slug: string }> };

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      url: `https://www.tikiacca.com/blog/${post.slug}`,
    },
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

  return (
    <MarketingShell path={`/blog/${post.slug}`}>
      <div className="marketing-gradient border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-14 md:py-18">
          <Link href="/blog" className="text-sm text-accent hover:underline">
            ← All posts
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {post.title}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {formatPostDate(post.date)} · {post.readingMinutes} min read
          </p>
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
            className="mt-4 inline-block rounded-xl bg-accent px-6 py-2.5 font-medium text-black transition-colors hover:bg-accent-bright"
          >
            Start a group — free
          </Link>
        </div>
      </article>
    </MarketingShell>
  );
}
