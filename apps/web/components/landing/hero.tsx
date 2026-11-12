"use client";

import { ArrowRight, ArrowUpRight, Bomb, Check, FileKey2, Lock, ShieldCheck } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Lamp } from "@/components/brand";
import { accountLink } from "@/components/format";
import { Button } from "@/components/ui/button";
import type { VaultSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EASE, Mask } from "./motion";

/** Reads the real vault once. Falls back to a plain label when the API isn't configured. */
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
  const body = (
    <>
      <Lamp state={snap ? (tripped ? "tripped" : "armed") : "idle"} className="size-2" />
      <span>
        {snap
          ? `Vault ${tripped ? "tripped" : "armed"} · ${live ? snap.network : "simulation"}`
          : "AI agent security on NEAR"}
      </span>
      {href && <ArrowUpRight className="size-3.5 text-muted-foreground" />}
    </>
  );
  const cls =
    "inline-flex items-center gap-2.5 rounded-full border border-black/7 bg-white/80 py-1.5 pr-3.5 pl-3 text-[13px] font-medium shadow-[0_1px_2px_rgb(0_0_0/0.04)] backdrop-blur";
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      data-testid="live-chip"
      className={cn(cls, "transition-colors hover:bg-white")}
    >
      {body}
    </a>
  ) : (
    <span data-testid="live-chip" className={cls}>
      {body}
    </span>
  );
}

const PAYMENTS = [
  { to: "acme-hosting.testnet", amount: 0.2 },
  { to: "northwind-data.testnet", amount: 0.35 },
  { to: "acme-hosting.testnet", amount: 0.12 },
  { to: "northwind-data.testnet", amount: 0.08 },
  { to: "acme-hosting.testnet", amount: 0.25 },
];
const KEYS = ["7HkQ…q2Fa", "B3nx…9TcL", "Ex4r…mW1d", "Kp8z…Zu5e"];

/** The "product shot": a vault armed and paying, every payment carrying a signer proof. */
function VaultMonitor() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const [feed, setFeed] = useState(() => PAYMENTS.slice(0, 3).map((p, id) => ({ ...p, id })));
  const [spent, setSpent] = useState(0.67);
  const tick = useRef(3);

  useEffect(() => {
    if (!visible || reduce) return;
    const timer = setInterval(() => {
      const id = tick.current++;
      const next = { ...PAYMENTS[id % PAYMENTS.length]!, id };
      setFeed((current) => [next, ...current].slice(0, 3));
      setSpent((s) => (s + next.amount > 1.9 ? 0.2 : s + next.amount));
    }, 2600);
    return () => clearInterval(timer);
  }, [visible, reduce]);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[22px] border border-black/8 bg-white shadow-[0_1px_0_rgb(255_255_255)_inset,0_50px_120px_-50px_rgb(0_0_0/0.4),0_18px_40px_-24px_rgb(0_0_0/0.22)]"
    >
      <div className="flex items-center gap-3 border-b border-black/6 bg-[#fcfcfb] px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-black/9" />
          <span className="size-2.5 rounded-full bg-black/9" />
          <span className="size-2.5 rounded-full bg-black/9" />
        </div>
        <div className="mx-auto flex min-w-0 items-center gap-1.5 rounded-md bg-black/[0.035] px-3 py-1 font-mono text-[11px] text-muted-foreground">
          <Lock className="size-3 flex-none" />
          <span className="truncate">vault.telltale.testnet</span>
        </div>
        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
          epoch 0
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr_1.25fr]">
        <div className="relative border-b border-black/6 p-6 sm:p-8 md:border-r md:border-b-0">
          <div className="hero-grid absolute inset-0 bg-armed-soft/50" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <Lamp state="armed" className="size-11 sm:size-12" />
            <div>
              <div className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Vault state
              </div>
              <div className="text-[34px] leading-tight font-semibold tracking-tight text-armed">
                ARMED
              </div>
            </div>
          </div>
          <div className="relative mt-7 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Spent today</span>
              <span className="font-mono">{spent.toFixed(2)} / 2.00 NEAR</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/6">
              <motion.div
                className="h-full rounded-full bg-foreground"
                initial={false}
                animate={{ width: `${(spent / 2) * 100}%` }}
                transition={{ duration: 0.9, ease: EASE }}
              />
            </div>
          </div>
          <div className="relative mt-6 grid grid-cols-2 gap-2">
            {KEYS.map((key) => (
              <div
                key={key}
                className="flex items-center gap-2 rounded-lg border border-black/7 bg-white px-2.5 py-2 font-mono text-[11px]"
              >
                <span className="size-1.5 flex-none rounded-full bg-armed" />
                <span className="truncate">{key}</span>
              </div>
            ))}
          </div>
          <div className="relative mt-3 text-[11px] text-muted-foreground">
            4 agent keys · pay only
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Payments</span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-armed/60" />
                <span className="relative size-1.5 rounded-full bg-armed" />
              </span>
              live
            </span>
          </div>
          <ul className="mt-4 h-[13.25rem] space-y-2 overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              {feed.map((p) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: -14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.55, ease: EASE }}
                  className="flex items-center gap-3 rounded-xl border border-black/7 bg-white px-3.5 py-3"
                >
                  <span className="grid size-8 flex-none place-items-center rounded-lg bg-armed-soft text-armed">
                    <ArrowUpRight className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[12px]">{p.to}</div>
                    <div className="text-[11px] text-muted-foreground">pay · agent key</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[13px] font-medium">
                      {p.amount.toFixed(2)} NEAR
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[11px] text-armed">
                      <Check className="size-3" />
                      proof ok
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
    </div>
  );
}

/** A small card that floats beside the monitor at its own parallax depth. */
function FloatChip({
  className,
  depth,
  progress,
  px,
  py,
  icon,
  tone,
  label,
  value,
  delay,
}: {
  className: string;
  depth: number;
  progress: MotionValue<number>;
  px: MotionValue<number>;
  py: MotionValue<number>;
  icon: ReactNode;
  tone: "armed" | "brand" | "tripped";
  label: string;
  value: string;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const scrollY = useTransform(progress, [0, 1], [0, reduce ? 0 : -depth * 260]);
  const x = useTransform(px, (v) => (reduce ? 0 : v * depth * 40));
  const yPointer = useTransform(py, (v) => (reduce ? 0 : v * depth * 30));
  const y = useTransform(() => scrollY.get() + yPointer.get());
  const toneCls = {
    armed: "bg-armed-soft text-armed",
    brand: "bg-brand-soft text-amber-600",
    tripped: "bg-tripped-soft text-tripped",
  }[tone];

  return (
    <motion.div
      aria-hidden="true"
      style={{ x, y }}
      className={cn("pointer-events-none absolute z-10 hidden xl:block", className)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, ease: EASE, delay }}
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -7, 0] }}
          transition={{ duration: 6 + depth * 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-3 rounded-2xl border border-black/7 bg-white/90 py-2.5 pr-4 pl-2.5 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.35)] backdrop-blur"
        >
          <span className={cn("grid size-8 place-items-center rounded-xl", toneCls)}>{icon}</span>
          <div>
            <div className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {label}
            </div>
            <div className="font-mono text-[12px]">{value}</div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const gridY = useTransform(p, [0, 1], ["0%", reduce ? "0%" : "22%"]);
  const glowScale = useTransform(p, [0, 1], [1, reduce ? 1 : 1.4]);
  const textY = useTransform(p, [0, 1], [0, reduce ? 0 : -160]);
  const textOpacity = useTransform(p, [0, 0.45], [1, reduce ? 1 : 0]);
  const tilt = useTransform(p, [0, 0.42], [reduce ? 0 : 26, 0]);
  const cardScale = useTransform(p, [0, 0.42], [reduce ? 1 : 0.9, 1]);
  const cardY = useTransform(p, [0, 1], [0, reduce ? 0 : -40]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 50, damping: 18 });
  const py = useSpring(my, { stiffness: 50, damping: 18 });

  return (
    <section
      ref={ref}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      className="relative isolate overflow-clip pt-32 pb-20 sm:pt-44 sm:pb-28"
    >
      <motion.div
        aria-hidden="true"
        style={{ y: gridY }}
        className="dot-field pointer-events-none absolute inset-0 -z-10"
      />
      <div aria-hidden="true" className="rule-field pointer-events-none absolute inset-0 -z-10" />
      <motion.div
        aria-hidden="true"
        style={{ scale: glowScale }}
        className="pointer-events-none absolute top-[64%] left-1/2 -z-10 size-[min(1200px,160vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(245_158_11/0.16),rgb(245_158_11/0.05)_45%,transparent)]"
      />

      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="relative mx-auto max-w-5xl px-4 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
        >
          <LiveChip />
        </motion.div>

        <h1 className="mt-7 font-serif text-[clamp(3.25rem,10.5vw,8.5rem)] leading-[0.9] tracking-tight">
          <span className="sr-only">Every agent key is a tripwire.</span>
          <span aria-hidden="true">
            <Mask delay={0.18}>Every</Mask> <Mask delay={0.25}>agent</Mask>{" "}
            <Mask delay={0.32}>key</Mask>
            <br />
            <Mask delay={0.39}>is</Mask> <Mask delay={0.46}>a</Mask>{" "}
            <Mask delay={0.53}>
              <em>tripwire.</em>
            </Mask>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.8 }}
          className="mx-auto mt-7 max-w-[35rem] text-[17px] leading-relaxed text-pretty text-muted-foreground sm:text-lg"
        >
          A NEAR vault for AI agents. Use a stolen key or hijack the agent, and the vault freezes
          itself and deletes every key. No human in the loop.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.95 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Button
            asChild
            size="lg"
            data-testid="hero-launch"
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
            <Link href="/lab">Watch it trip</Link>
          </Button>
        </motion.div>
      </motion.div>

      <div className="relative mx-auto mt-16 max-w-5xl px-4 [perspective:1800px] sm:mt-24 sm:px-6">
        <FloatChip
          progress={p}
          px={px}
          py={py}
          depth={0.9}
          delay={1.5}
          tone="armed"
          icon={<ShieldCheck className="size-4" />}
          label="Signer proof"
          value="ed25519 ✓ bound to key"
          className="top-[4.5rem] -left-20"
        />
        <FloatChip
          progress={p}
          px={px}
          py={py}
          depth={1.4}
          delay={1.65}
          tone="brand"
          icon={<Bomb className="size-4" />}
          label="Decoy tool"
          value="raise_spending_limit()"
          className="top-28 -right-14"
        />
        <FloatChip
          progress={p}
          px={px}
          py={py}
          depth={0.6}
          delay={1.8}
          tone="tripped"
          icon={<FileKey2 className="size-4" />}
          label="Bait · .env"
          value="AGENT_KEY=ed25519:…"
          className="top-[26rem] -left-16"
        />
        <motion.div
          initial={{ opacity: 0, y: 70 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.85 }}
        >
          <motion.div
            style={{ rotateX: tilt, scale: cardScale, y: cardY, transformOrigin: "50% 0%" }}
          >
            <VaultMonitor />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
