import { ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark, StatusBadge, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

/** 404: the same error a thief gets after the vault trips. */
export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <div
        aria-hidden="true"
        className="bg-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_55%_50%_at_50%_45%,#000,transparent)]"
      />
      <header className="border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Telltale home">
            <LogoMark className="size-7" />
            <Wordmark className="text-[15px]" />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto w-fit">
            <StatusBadge state="tripped">404</StatusBadge>
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tighter text-balance sm:text-5xl">
            Nothing here but a tripwire.
          </h1>
          <p className="mt-3 text-muted-foreground">
            This page doesn&apos;t exist. No keys were harmed.
          </p>

          <div className="mx-auto mt-7 flex items-center gap-2.5 rounded-lg border bg-card px-3.5 py-2.5 text-left font-mono text-xs shadow-xs">
            <KeyRound className="size-3.5 flex-none text-tripped" />
            <span className="truncate text-muted-foreground">GET {"/this-page"}</span>
            <span className="ml-auto flex-none text-tripped">access key does not exist</span>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Button asChild variant="outline" className="h-10 bg-card px-5">
              <Link href="/">
                <ArrowLeft className="size-4" /> Home
              </Link>
            </Button>
            <Button asChild className="group h-10 px-5">
              <Link href="/how-it-works">
                Launch
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
