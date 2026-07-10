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
  metadataBase: new URL("https://www.the-syndicate.uk"),
  title: {
    default: "The Syndicate — Social Group Accas",
    template: "%s · The Syndicate",
  },
  description:
    "Create social betting groups, contribute legs to shared football accumulators, and compete on the leaderboard.",
  openGraph: {
    title: "The Syndicate — Social Group Accas",
    description:
      "Build accas with your mates. Each member picks a leg, track combined odds, and compete on the leaderboard.",
    url: "https://www.the-syndicate.uk",
    siteName: "The Syndicate",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Syndicate — Social Group Accas",
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
