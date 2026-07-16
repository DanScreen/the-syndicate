import { Providers } from "@/components/providers";
import type { Metadata } from "next";
import { Geist, Outfit } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tikiacca.com"),
  title: {
    default: "Tiki Acca: Social Group Accas",
    template: "%s · Tiki Acca",
  },
  description:
    "Create social betting groups, contribute legs to shared football accumulators, and compete on the leaderboard.",
  icons: {
    // Query cache-bust — /icon.svg is served with long-lived immutable CDN cache.
    // Bump when the mark changes (inverted rondo + centre player = v3, July 2026).
    icon: [
      { url: "/icon.svg?v=3", type: "image/svg+xml" },
      { url: "/favicon.ico?v=3", sizes: "48x48" },
    ],
    apple: "/apple-icon?v=3",
  },
  openGraph: {
    title: "Tiki Acca: Social Group Accas",
    description:
      "Build accas with your mates. Each member picks a leg, track combined odds, and compete on the leaderboard.",
    url: "https://www.tikiacca.com",
    siteName: "Tiki Acca",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tiki Acca: Social Group Accas",
    description:
      "Build accas with your mates. Each member picks a leg and competes on the leaderboard.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${outfit.variable} antialiased min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
