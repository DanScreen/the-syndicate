import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * File-based blog: posts are .mdx files in apps/web/content/blog with
 * frontmatter. Read at build time only (all blog routes are statically
 * generated), so no runtime fs or DB cost. Publishing = git push.
 */

export type PostFrontmatter = {
  title: string;
  description: string;
  /** ISO date, e.g. 2026-07-15 */
  date: string;
  tags?: string[];
  /** Draft posts render in dev but are excluded from production builds. */
  draft?: boolean;
};

export type PostSummary = PostFrontmatter & {
  slug: string;
  readingMinutes: number;
};

export type Post = PostSummary & {
  content: string;
};

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function readingMinutes(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function parseFile(filename: string): Post {
  const slug = filename.replace(/\.mdx?$/, "");
  const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf8");
  const { data, content } = matter(raw);
  const fm = data as PostFrontmatter;
  return {
    slug,
    title: fm.title,
    description: fm.description,
    date: fm.date,
    tags: fm.tags ?? [],
    draft: Boolean(fm.draft),
    readingMinutes: readingMinutes(content),
    content,
  };
}

function includeDrafts(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    .map(parseFile)
    .filter((p) => includeDrafts() || !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): Post | null {
  const safe = slug.replace(/[^a-z0-9-]/gi, "");
  for (const ext of [".mdx", ".md"]) {
    const file = path.join(BLOG_DIR, `${safe}${ext}`);
    if (fs.existsSync(file)) {
      const post = parseFile(`${safe}${ext}`);
      if (post.draft && !includeDrafts()) return null;
      return post;
    }
  }
  return null;
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
