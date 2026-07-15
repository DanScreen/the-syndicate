import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * File-based blog: posts are .mdx files in apps/web/content/blog with
 * frontmatter. Read at build time only (all blog routes are statically
 * generated), so no runtime fs or DB cost. Publishing = git push.
 */

/** Default author when a post omits one — keeps JSON-LD author non-empty. */
export const DEFAULT_AUTHOR = "The Tiki Acca team";

export type PostFrontmatter = {
  title: string;
  description: string;
  /** ISO publish date, e.g. 2026-07-15 */
  date: string;
  /** ISO date of the last meaningful edit. Defaults to `date` when omitted. */
  updated?: string;
  /** Named author for byline + JSON-LD. Defaults to DEFAULT_AUTHOR. */
  author?: string;
  tags?: string[];
  /** Draft posts render in dev but are excluded from production builds. */
  draft?: boolean;
};

export type PostSummary = Omit<PostFrontmatter, "updated" | "author"> & {
  slug: string;
  readingMinutes: number;
  /** Always resolved (falls back to `date`). */
  updated: string;
  /** Always resolved (falls back to DEFAULT_AUTHOR). */
  author: string;
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
    updated: fm.updated ?? fm.date,
    author: fm.author ?? DEFAULT_AUTHOR,
    tags: fm.tags ?? [],
    draft: Boolean(fm.draft),
    readingMinutes: readingMinutes(content),
    content,
  };
}

/** Normalise a tag to a URL slug: lower-case, spaces → hyphens. */
export function tagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
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

/** All distinct tag slugs across published posts, for static params. */
export function getAllTags(): string[] {
  const slugs = new Set<string>();
  for (const post of getAllPosts()) {
    for (const tag of post.tags ?? []) slugs.add(tagSlug(tag));
  }
  return [...slugs].sort();
}

/** Published posts carrying the given tag slug, plus its display label. */
export function getPostsByTag(slug: string): { label: string; posts: Post[] } {
  const target = tagSlug(slug);
  let label = target;
  const posts = getAllPosts().filter((post) =>
    (post.tags ?? []).some((tag) => {
      if (tagSlug(tag) === target) {
        label = tag;
        return true;
      }
      return false;
    })
  );
  return { label, posts };
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
