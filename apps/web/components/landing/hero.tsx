"use client";

import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Lamp } from "@/components/brand";
import { accountLink } from "@/components/format";
import { Button } from "@/components/ui/button";
import type { VaultSnapshot } from "@/lib/types";
import { EASE } from "./motion";
import { TripDemo } from "./trip-demo";

/** Reads the real vault once; falls back to a plain label when the API isn't configured. */
function LiveChip() {
  const [snap, setSnap] = useState<VaultSnapshot | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/vault", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<VaultSnapshot>) : null))
      .then((body) => alive && setSnap(body))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const tripped = snap?.status.frozen ?? false;
  const live = snap?.mode === "live";
  const href = snap && live ? accountLink(snap.explorerUrl, snap.vaultId) : null;
  const label = snap
    ? `Vault ${tripped ? "tripped" : "armed"} · ${live ? snap.network : "simulation"}`
    : "AI agent security on NEAR";
  const cls =
    "group inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-2.5 pl-3 text-xs font-medium shadow-xs transition-colors hover:bg-muted/60";
  const body = (
    <>
      <Lamp
        state={snap ? (tripped ? "tripped" : "armed") : "idle"}
        ping={Boolean(snap)}
        className="size-1.5"
      />
      <span>{label}</span>
      <span className="h-3 w-px bg-border" />
      <span className="flex items-center gap-0.5 text-muted-foreground group-hover:text-foreground">
        {href ? "NearBlocks" : "Attack lab"}
        {href ? <ArrowUpRight className="size-3" /> : <ArrowRight className="size-3" />}
      </span>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" data-testid="live-chip" className={cls}>
      {body}
    </a>
  ) : (
    <Link href="/lab" data-testid="live-chip" className={cls}>
      {body}
    </Link>
  );
}

/** "tripwire" with a taut dashed wire under it. */
function Tripwire() {
  return (
    <span className="relative inline-block whitespace-nowrap">
      tripwire
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        className="absolute -bottom-[0.04em] left-0 h-[0.14em] w-full origin-left overflow-visible"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.55 }}
      >
        <line
          x1="0"
          y1="4"
          x2="100"
          y2="4"
          stroke="var(--tripped)"
          strokeOpacity="0.75"
          strokeWidth="2.2"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      </motion.svg>
    </span>
  );
}

const POINTS = [
  "Freezes in the same transaction",
  "Deletes every agent key",
  "No decoy list on-chain",
];

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE, delay },
});

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const gridY = useTransform(p, [0, 1], [0, reduce ? 0 : 120]);
  const demoY = useTransform(p, [0, 1], [0, reduce ? 0 : -60]);
  const copyY = useTransform(p, [0, 1], [0, reduce ? 0 : 30]);

  return (
    <section ref={ref} aria-label="Telltale" className="relative isolate overflow-hidden">
      <motion.div
        aria-hidden="true"
        style={{ y: gridY }}
        className="bg-grid mask-fade-b pointer-events-none absolute inset-x-0 -top-10 -z-10 h-[120%]"
      />
      <div className="grid items-center gap-10 px-5 pt-12 pb-14 sm:px-8 md:pt-16 md:pb-20 lg:grid-cols-[1.08fr_1fr] lg:gap-14">
        <motion.div style={{ y: copyY }}>
          <motion.div {...rise(0.05)}>
            <LiveChip />
          </motion.div>
          <motion.h1
            {...rise(0.12)}
            className="mt-5 text-[2.6rem] leading-[1.04] font-semibold tracking-tighter text-balance sm:text-5xl lg:text-[3.6rem]"
          >
            Every agent key is a <Tripwire />.
          </motion.h1>
          <motion.p
            {...rise(0.2)}
            className="mt-5 max-w-[30rem] text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
          >
            A NEAR vault for AI agents. Use a stolen key or hijack the agent, and the vault freezes
            itself and deletes every key. No human in the loop.
          </motion.p>
          <motion.div {...rise(0.28)} className="mt-7 flex flex-wrap gap-2.5">
            <Button asChild size="lg" className="group h-10 px-5" data-testid="hero-launch">
              <Link href="/how-it-works">
                Launch
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-10 bg-card px-5">
              <Link href="/lab">Watch it trip</Link>
            </Button>
          </motion.div>
          <motion.ul
            {...rise(0.36)}
            className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground"
          >
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-armed" />
                {point}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
        >
          <motion.div style={{ y: demoY }}>
            <TripDemo />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
