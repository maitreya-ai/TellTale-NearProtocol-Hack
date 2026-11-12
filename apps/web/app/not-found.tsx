import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Lamp, LogoMark, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

/** 404: the same error a thief gets after the vault trips. */
export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-clip">
      <div aria-hidden="true" className="dot-field pointer-events-none absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[min(900px,150vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(220_38_38/0.1),transparent)]"
      />
      <header className="mx-auto flex w-full max-w-5xl items-center px-4 pt-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Telltale home">
          <LogoMark className="size-9" />
          <Wordmark className="text-[17px]" />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-tripped/20 bg-white/80 py-1.5 pr-3.5 pl-3 font-mono text-[12px] text-tripped shadow-sm backdrop-blur">
          <Lamp state="tripped" className="size-2" />
          404 · access key does not exist
        </div>
        <h1 className="mt-8 font-serif text-[clamp(3.25rem,10vw,7.5rem)] leading-[0.92] tracking-tight">
          Nothing here
          <br />
          <em className="text-black/35">but a tripwire.</em>
        </h1>
        <p className="mt-7 max-w-md text-[17px] leading-relaxed text-muted-foreground">
          This page doesn&apos;t exist. No keys were harmed.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="outline" className="h-12 rounded-full bg-white px-6">
            <Link href="/">
              <ArrowLeft className="size-4" /> Home
            </Link>
          </Button>
          <Button asChild size="lg" className="group h-12 rounded-full px-6">
            <Link href="/how-it-works">
              Launch
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
