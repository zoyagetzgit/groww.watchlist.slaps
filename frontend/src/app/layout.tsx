import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Dropped the serif pairing from the earlier draft entirely. Groww's actual
// type system (Soehne + a custom GrowwSans) is all-sans, tight, and
// functional - fintech apps don't reach for a serif voice, and keeping one
// around was part of what made this read as a written blog post rather than
// a trading app. Inter is the closest widely-available stand-in for that
// grotesque-sans feel without needing a licensed font.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Watchlist - what actually changed",
  description: "A market watchlist that tells you what deserves your attention, not just what moved.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
