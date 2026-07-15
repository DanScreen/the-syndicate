# Blog authoring standards

The blog is a **file-based, statically generated** system. Posts are `.mdx`
files in `apps/web/content/blog/`. Publishing is `git push` — a merge to `main`
builds and deploys the post. There is no CMS and no runtime database cost.

These standards are **strict**: every post must meet them before merge. They
exist so every post ships SEO-complete, because retrofitting metadata onto a
live URL is worse than getting it right once.

## How it renders (so you know what the rules protect)

| Concern | Where it's handled | You control it via |
|---|---|---|
| HTML/routing | `app/blog/[slug]/page.tsx` (static, `force-static`) | file existence |
| Title / meta description | `generateMetadata` | `title`, `description` frontmatter |
| Canonical URL | `alternates.canonical` | automatic (`/blog/<slug>`) |
| OpenGraph / Twitter | `generateMetadata` + `opengraph-image.tsx` | `title`, `description`, `tags` |
| Social share image | `app/blog/[slug]/opengraph-image.tsx` | `title` + first `tag` (auto) |
| Structured data | `BlogPosting` JSON-LD in `page.tsx` | frontmatter fields |
| Sitemap entry | `app/sitemap.ts` (`getAllPosts`) | automatic, uses `updated` |
| Tag hub pages | `app/blog/tag/[tag]/page.tsx` | `tags` frontmatter |
| Reading time | `lib/blog.ts` (~200 wpm) | body length |

Everything downstream is driven by frontmatter. Get the frontmatter right and
the SEO is correct by construction.

## Required frontmatter

```mdx
---
title: "What is an acca? Accumulator betting, explained properly"
description: "Accas explained in plain English: how accumulator odds multiply, why one leg can sink the lot, and why they're better built with your mates."
date: "2026-07-15"
updated: "2026-07-15"
author: "The Tiki Acca team"
tags: ["guides", "basics"]
draft: false
---
```

| Field | Required | Rule |
|---|---|---|
| `title` | ✅ | 50–60 characters ideal, **≤ 60**. Front-load the keyword. One `<h1>` — never add a `#` heading in the body (the title *is* the h1). |
| `description` | ✅ | **150–160 characters.** A real summary containing the primary keyword, not a teaser. Google truncates past ~160. Never duplicate another post's description. |
| `date` | ✅ | ISO `YYYY-MM-DD`. Publish date. Never change it after publishing. |
| `updated` | ✅ | ISO `YYYY-MM-DD`. Set equal to `date` at first publish; **bump it on every meaningful edit** — it drives `dateModified` in JSON-LD and `lastModified` in the sitemap (freshness signal). |
| `author` | ✅ | Named byline. Default `"The Tiki Acca team"`. |
| `tags` | ✅ | 1–3 lower-case tags. Each generates a `/blog/tag/<slug>` hub page and appears in `keywords` + OG tags. Reuse existing tags — don't invent a one-off tag that will only ever have a single post. |
| `draft` | optional | `true` hides the post in production (visible in dev). Omit or `false` to publish. |

If `updated` or `author` are omitted the system falls back (`updated → date`,
`author → "The Tiki Acca team"`), but **write them explicitly** so intent is
visible in the file.

## Body rules

- **Headings:** body uses `##` (h2) and `###` (h3) only. Never `#` — that would
  produce a second h1. Keep a logical h2 → h3 hierarchy; don't skip levels.
- **First paragraph** must contain the primary keyword and stand alone as a
  summary — it's often what Google pulls for a snippet.
- **Internal links:** at least one link to a product route (`/sign-up`,
  `/about`, or a related post). Link related posts to each other.
- **Length:** aim for 600+ words for a guide. Thin posts (< 300 words) rank
  poorly and dilute the domain — don't publish them.
- **No betting tips.** Ever. Editorial line: we explain and coordinate, we do
  not tip. (Also a compliance line, not just brand.)
- **Responsible-gambling footer** on any post discussing staking real money:
  link `BeGambleAware.org` and state 18+.
- **Descriptive slug** = the filename (`what-is-an-acca.mdx` → `/blog/what-is-an-acca`).
  Lower-case, hyphenated, keyword-bearing, stable. **Never rename a published
  file** — that breaks the URL. If a slug must change, add a redirect.

## Pre-merge checklist

Every post must pass all of these before merge:

- [ ] `title` ≤ 60 chars, keyword front-loaded, unique
- [ ] `description` 150–160 chars, keyword-bearing, unique
- [ ] `date`, `updated`, `author`, `tags` all present and valid
- [ ] `updated` bumped if this is an edit to an existing post
- [ ] No `#` (h1) in the body; clean `##`/`###` hierarchy
- [ ] First paragraph carries the primary keyword and reads as a summary
- [ ] ≥ 1 internal link to a product route or related post
- [ ] Tags reuse existing ones where possible; each is intentional
- [ ] Responsible-gambling footer present if real-money staking is discussed
- [ ] `npm run build` succeeds (validates MDX + static generation)
- [ ] Preview `/blog/<slug>` locally and confirm the OG image renders at
      `/blog/<slug>/opengraph-image`

## What ships automatically (do not hand-roll)

You do **not** add these per post — the system generates them from frontmatter.
Do not duplicate or override them:

- Canonical tag, OpenGraph + Twitter meta, `article:published_time` /
  `modified_time`.
- The `BlogPosting` JSON-LD block (headline, dates, author, publisher, image).
- The 1200×630 social share image.
- Sitemap and tag-hub inclusion.

If you find yourself pasting `<meta>` or `<script type="application/ld+json">`
into a post, stop — that belongs in `page.tsx`, applied to every post uniformly.
