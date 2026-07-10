/**
 * Archived brand explorations — not used in production.
 * Locked choices: Turf Green tokens (globals.css) + Acca stack logo (components/logo.tsx).
 */

export const archivedLogoVariants = [
  {
    id: "crest",
    name: "Syndicate crest",
    description: "Badge shape with three stripes — group identity, pub syndicate feel.",
  },
  {
    id: "pitch",
    name: "Pitch mark",
    description: "Minimal pitch corner and centre spot — football-first, subtle.",
  },
  {
    id: "monogram",
    name: "S monogram",
    description: "Bold geometric S — clean wordmark companion, works at any size.",
  },
  {
    id: "nodes",
    name: "Linked nodes",
    description: "Three connected points — reads network-y; rejected.",
  },
] as const;

export type ArchivedLogoVariant = (typeof archivedLogoVariants)[number]["id"];

export const archivedDesignConcepts = [
  {
    id: "turf-green",
    name: "Turf Green",
    tagline: "Dark, sharp, matchday energy",
    description:
      "Deep navy background with vivid pitch green accents. Feels like a modern betting companion — confident, data-forward, built for Saturday afternoons.",
    tokens: {
      background: "#0b1220",
      card: "#111827",
      accent: "#22c55e",
      accentBright: "#4ade80",
      foreground: "#f1f5f9",
      muted: "#94a3b8",
    },
    status: "live" as const,
  },
  {
    id: "match-night",
    name: "Match Night",
    tagline: "Warm pub syndicate vibes",
    description:
      "Charcoal and amber tones evoke the matchday pub — social, familiar, less fintech.",
    tokens: {
      background: "#141210",
      card: "#1c1917",
      accent: "#f59e0b",
      accentBright: "#fbbf24",
      foreground: "#fafaf9",
      muted: "#a8a29e",
    },
    status: "archived" as const,
  },
  {
    id: "clean-pitch",
    name: "Clean Pitch",
    tagline: "Light, approachable, mainstream",
    description:
      "Off-white with deep forest green. Broader appeal for users who find dark betting UIs off-putting.",
    tokens: {
      background: "#f8faf9",
      card: "#ffffff",
      accent: "#15803d",
      accentBright: "#16a34a",
      foreground: "#0f172a",
      muted: "#64748b",
    },
    status: "archived" as const,
  },
] as const;
