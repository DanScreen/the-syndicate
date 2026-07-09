import { Providers } from "@/components/providers";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://the-syndicate.uk"),
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
    url: "https://the-syndicate.uk",
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
      <body className={`${geistSans.variable} antialiased min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
