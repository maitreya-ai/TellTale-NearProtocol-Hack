"use client";

import { ArrowRight } from "lucide-react";
import { motion, useScroll, useSpring } from "motion/react";
import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/brand";
import { GitHubMark } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { REPO_URL } from "@/lib/site";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#near", label: "Why NEAR" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export function LandingNav() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 32, mass: 0.3 });

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-6xl items-center gap-6 pr-[max(16px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))] sm:px-8"
      >
        <Link href="/" aria-label="Telltale home" className="flex items-center gap-2.5">
          <LogoMark live className="size-7" />
          <Wordmark className="text-[15px]" />
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) =>
            link.href.startsWith("#") ? (
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="icon" asChild className="size-8">
            <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="Source on GitHub">
              <GitHubMark className="size-4" />
            </a>
          </Button>
          <Button asChild size="sm" data-testid="nav-launch" className="group h-8 pr-2.5 pl-3.5">
            <Link href="/how-it-works">
              Launch
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </nav>
      <motion.div
        aria-hidden="true"
        style={{ scaleX: progress }}
        className="absolute inset-x-0 -bottom-px h-px origin-left bg-foreground/70"
      />
    </header>
  );
}
