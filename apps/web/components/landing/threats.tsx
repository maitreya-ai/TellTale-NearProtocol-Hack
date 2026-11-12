"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Fragment, useRef } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow, Reveal } from "./motion";

const THREATS = [
  "a stolen .env",
  "a malicious skill",
  "a prompt injection",
  "a poisoned invoice",
  "a leaked backup",
  "a jailbroken agent",
];

// The real decoys and bait the repo plants (packages/core, scripts/plant-bait.ts).
const ARTIFACTS = [
  "raise_spending_limit()",
  "pay() · no proof",
  "export_wallet_backup()",
  "AGENT_KEY=ed25519:…",
  "sweep_to_cold_storage()",
  "wallet-backup.json",
];

export function Threats() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x1 = useTransform(p, [0, 1], reduce ? ["-10%", "-10%"] : ["2%", "-30%"]);
  const x2 = useTransform(p, [0, 1], reduce ? ["-20%", "-20%"] : ["-34%", "-4%"]);

  return (
    <section
      ref={ref}
      aria-labelledby="threats-label"
      className="relative overflow-clip py-16 sm:py-24"
    >
      <Reveal className="px-4 text-center">
        <Eyebrow>
          <span id="threats-label">Trips on</span>
        </Eyebrow>
      </Reveal>
      <ul className="sr-only">
        {THREATS.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <div aria-hidden="true" className="edge-fade mt-10 space-y-6 sm:mt-12">
        <motion.div
          style={{ x: x1 }}
          className="flex w-max items-center gap-7 font-serif text-[clamp(2.75rem,7.5vw,6.75rem)] leading-[1.08] tracking-[-0.02em] whitespace-nowrap sm:gap-10"
        >
          {[...THREATS, ...THREATS].map((t, i) => (
            <Fragment key={i}>
              <span className={cn(i % 2 === 1 && "text-black/30 italic")}>{t}</span>
              <span className="size-2.5 flex-none rounded-full bg-brand shadow-[0_0_18px_rgb(245_158_11/0.7)] sm:size-3" />
            </Fragment>
          ))}
        </motion.div>
        <motion.div
          style={{ x: x2 }}
          className="flex w-max items-center gap-3 font-mono text-[13px] whitespace-nowrap text-muted-foreground sm:text-sm"
        >
          {[...ARTIFACTS, ...ARTIFACTS, ...ARTIFACTS].map((a, i) => (
            <span key={i} className="rounded-full border border-black/7 bg-[#fafaf9] px-3.5 py-1.5">
              {a}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
