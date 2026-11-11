import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VaultProvider } from "@/components/vault-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telltale",
  description:
    "Every AI agent key is a tripwire. A stolen key or a hijacked agent freezes the vault and deletes every key, on NEAR.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#fafaf9" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <TooltipProvider delayDuration={200}>
          <VaultProvider>
            <AppShell>{children}</AppShell>
          </VaultProvider>
        </TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
