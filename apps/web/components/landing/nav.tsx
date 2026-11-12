"use client";

import { ArrowRight } from "lucide-react";
import { motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { LogoMark, Wordmark } from "@/components/brand";
import { GitHubMark } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { REPO_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { EASE } from "./motion";

const LINKS = [
  { href: "#how", label: "How it trips" },
  { href: "#near", label: "Why NEAR" },
] as const;

export function LandingNav() {
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 32, mass: 0.3 });
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 16));

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-[max(12px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pl-[max(12px,env(safe-area-inset-left))] sm:pt-4">
      <motion.nav
        aria-label="Main"
        initial={{ y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
        className={cn(
          "relative mx-auto flex h-14 max-w-5xl items-center gap-1 rounded-full border pr-1.5 pl-2 transition-[background-color,border-color,box-shadow] duration-500",
          scrolled
            ? "border-black/7 bg-white/75 shadow-[0_12px_40px_-20px_rgb(0_0_0/0.28)] backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-transparent",
        )}
      >
        <Link
          href="/"
          aria-label="Telltale home"
          className="flex items-center gap-2.5 rounded-full py-1 pr-2 pl-0.5"
        >
          <LogoMark live className="size-9" />
          <Wordmark className="text-[17px]" />
        </Link>

        <div className="ml-5 hidden items-center md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/dashboard"
            className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Source on GitHub"
            className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/4 hover:text-foreground"
          >
            <GitHubMark className="size-[18px]" />
          </a>
          <Button
            asChild
            data-testid="nav-launch"
            className="group h-10 rounded-full pr-3.5 pl-5 text-[14px] shadow-[0_8px_24px_-10px_rgb(0_0_0/0.55)]"
          >
            <Link href="/how-it-works">
              Launch
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>

        <motion.span
          aria-hidden="true"
          style={{ scaleX: progress }}
          className={cn(
            "pointer-events-none absolute inset-x-8 -bottom-px h-px origin-left bg-gradient-to-r from-transparent via-brand to-transparent transition-opacity duration-500",
            scrolled ? "opacity-100" : "opacity-0",
          )}
        />
      </motion.nav>
    </header>
  );
}
