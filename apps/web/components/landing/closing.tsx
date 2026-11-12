"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import { LogoMark, Wordmark } from "@/components/brand";
import { GitHubMark } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { REPO_URL } from "@/lib/site";
import { Eyebrow, Mask, Reveal } from "./motion";

const STATS = [
  { value: "Same tx", label: "the vault freezes" },
  { value: "One block", label: "until every key is deleted" },
  { value: "Zero", label: "decoys visible on-chain" },
  { value: "Nobody", label: "has to wake up" },
];

export function Stats() {
  return (
    <section
      aria-label="At a glance"
      className="mx-auto max-w-6xl px-4 pt-4 pb-24 sm:px-6 sm:pb-32"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="border-t border-black/10 pt-6">
            <div className="font-serif text-[clamp(2.75rem,5.5vw,4.5rem)] leading-none tracking-[-0.02em]">
              {s.value}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  {
    code: "env::signer_account_pk()",
    title: "Many keys, one account",
    body: "The contract sees exactly which key signed.",
  },
  {
    code: "FunctionCall → pay",
    title: "Keys that can’t spend",
    body: "A stolen key can’t move funds. It can only ask the vault.",
  },
  {
    code: "promise.delete_key(pk)",
    title: "Contracts that delete keys",
    body: "The alarm removes the keys itself.",
  },
];

function FeatureCard({
  feature,
  index,
  progress,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const y = useTransform(progress, [0, 1], reduce ? [0, 0] : [70 + index * 50, -20 - index * 25]);
  return (
    <motion.div
      style={{ y }}
      className="group relative overflow-hidden rounded-3xl border border-black/7 bg-white p-7 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_30px_70px_-40px_rgb(0_0_0/0.3)] transition-shadow duration-500 hover:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_40px_90px_-40px_rgb(0_0_0/0.4)] sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-[radial-gradient(closest-side,rgb(245_158_11/0.18),transparent)] opacity-0 transition-opacity duration-700 group-hover:opacity-100"
      />
      <div className="font-mono text-[11px] text-muted-foreground">0{index + 1}</div>
      <code className="mt-12 inline-block rounded-lg border border-black/7 bg-[#fafaf9] px-2.5 py-1.5 font-mono text-[12.5px]">
        {feature.code}
      </code>
      <h3 className="mt-5 text-xl font-semibold tracking-tight">{feature.title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{feature.body}</p>
    </motion.div>
  );
}

export function WhyNear() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  return (
    <section
      id="near"
      ref={ref}
      aria-labelledby="near-title"
      className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6 sm:pb-36"
    >
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <Eyebrow>Why NEAR</Eyebrow>
          <h2
            id="near-title"
            className="mt-4 font-serif text-[clamp(3rem,7vw,6rem)] leading-[0.92] tracking-tight"
          >
            <Mask inView>Only</Mask>{" "}
            <Mask inView delay={0.07}>
              on
            </Mask>{" "}
            <Mask inView delay={0.14}>
              <em>NEAR.</em>
            </Mask>
          </h2>
        </div>
        <Reveal delay={0.2}>
          <p className="max-w-xs text-[15px] leading-relaxed text-muted-foreground">
            Three protocol features, not conventions, make every key a tripwire.
          </p>
        </Reveal>
      </div>
      <div className="mt-14 grid gap-4 md:grid-cols-3 md:gap-5">
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} feature={f} index={i} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  );
}

export function Cta() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const glow = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.55, 1.15]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.6], [0.3, 1]);

  return (
    <section
      ref={ref}
      aria-labelledby="cta-title"
      className="relative isolate overflow-clip px-4 pt-28 pb-32 text-center sm:pt-40 sm:pb-44"
    >
      <div aria-hidden="true" className="dot-field pointer-events-none absolute inset-0 -z-10" />
      <motion.div
        aria-hidden="true"
        style={{ scale: glow, opacity: glowOpacity }}
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[min(1000px,160vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(245_158_11/0.24),rgb(245_158_11/0.06)_50%,transparent)]"
      />
      <Reveal>
        <LogoMark live className="mx-auto size-14 drop-shadow-[0_12px_24px_rgb(0_0_0/0.25)]" />
      </Reveal>
      <h2
        id="cta-title"
        className="mx-auto mt-9 max-w-4xl font-serif text-[clamp(3.1rem,8.5vw,7.5rem)] leading-[0.92] tracking-tight"
      >
        <Mask inView>Steal a key.</Mask>
        <br />
        <Mask inView delay={0.1}>
          <em>Watch it trip.</em>
        </Mask>
      </h2>
      <Reveal delay={0.2}>
        <p className="mx-auto mt-7 max-w-md text-[17px] leading-relaxed text-balance text-muted-foreground">
          Run the attacks yourself against a live vault on NEAR testnet.
        </p>
      </Reveal>
      <Reveal delay={0.3} className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button
          asChild
          size="lg"
          data-testid="cta-launch"
          className="group h-12 rounded-full px-6 text-[15px] shadow-[0_14px_34px_-14px_rgb(0_0_0/0.6)]"
        >
          <Link href="/how-it-works">
            Launch
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 rounded-full border-black/10 bg-white/70 px-6 text-[15px] backdrop-blur"
        >
          <Link href="/lab">Open the attack lab</Link>
        </Button>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-black/6 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-6" />
          <Wordmark className="text-foreground" />
          <span className="text-black/20">/</span>
          <span>Built at NEAR Hackathon 2026</span>
        </div>
        <nav aria-label="Footer" className="flex items-center gap-5">
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/lab" className="transition-colors hover:text-foreground">
            Attack lab
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <GitHubMark className="size-4" />
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
