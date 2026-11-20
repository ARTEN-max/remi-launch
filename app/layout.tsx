import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const siteUrl = getSiteUrl();
const title = "Remi — an AI that remembers you for years";
const description =
  "Most AI forgets you the second you open a new chat. Remi is a voice that remembers you for months and years, and checks in when it matters. Join the waitlist.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "Remi",
  authors: [{ name: "@AbdulRahmahk1x", url: "https://x.com/AbdulRahmahk1x" }],
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/",
    siteName: "Remi",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@AbdulRahmahk1x",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#F3EDE3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
