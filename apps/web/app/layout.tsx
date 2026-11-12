import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geist = localFont({
  src: "./fonts/geist.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/geist-mono.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

const description =
  "A NEAR vault for AI agents. Use a stolen key or hijack the agent, and the vault freezes itself and deletes every key. No human in the loop.";

export const metadata: Metadata = {
  // Absolute URLs for the social cards. Set SITE_URL at build time once the Worker URL is known.
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: { default: "Telltale · Every agent key is a tripwire", template: "%s · Telltale" },
  description,
  applicationName: "Telltale",
  openGraph: {
    type: "website",
    siteName: "Telltale",
    title: "Telltale · Every agent key is a tripwire",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Telltale · Every agent key is a tripwire",
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fafaf9",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
