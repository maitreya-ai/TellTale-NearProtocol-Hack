"use client";

import { Check, KeyRound, Landmark, RotateCcw, ShieldAlert, X } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useReducer, useRef, useState } from "react";
import { StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EASE } from "./motion";

type Tone = "ok" | "bad" | "alarm" | "info";
interface Line {
  id: number;
  tone: Tone;
  text: string;
}
interface State {
  phase: "armed" | "attack" | "tripped";
  epoch: number;
  keys: { id: string; flagged?: boolean }[];
  spent: number;
  log: Line[];
  seq: number;
}
type Action =
  | { type: "pay"; to: string; amount: number }
  | { type: "attack" }
  | { type: "trip" }
  | { type: "wipe" }
  | { type: "retry" }
  | { type: "rearm" };

const KEYSETS = [
  ["7HkQ…q2Fa", "B3nx…9TcL", "Ex4r…mW1d", "Kp8z…Zu5e"],
  ["Q9ws…Lr3b", "Ht2m…x8Kc", "Mv6p…Ae0n", "Zc1y…Wd7s"],
  ["Rb5t…Gq2m", "Ya8c…Np4x", "Lk3e…Vt9h", "Dw7j…Fs1u"],
];
const keysFor = (epoch: number) => KEYSETS[epoch % KEYSETS.length]!.map((id) => ({ id }));

const INITIAL: State = {
  phase: "armed",
  epoch: 0,
  keys: keysFor(0),
  spent: 0.4,
  log: [{ id: 0, tone: "ok", text: "pay(acme-hosting, 0.40) · proof ✓" }],
  seq: 1,
};

function reduce(s: State, a: Action): State {
  const line = (tone: Tone, text: string) => [...s.log, { id: s.seq, tone, text }].slice(-4);
  switch (a.type) {
    case "pay":
      return {
        ...s,
        spent: s.spent + a.amount > 1.8 ? a.amount : s.spent + a.amount,
        log: line("ok", `pay(${a.to}, ${a.amount.toFixed(2)}) · proof ✓`),
        seq: s.seq + 1,
      };
    case "attack":
      return {
        ...s,
        phase: "attack",
        keys: s.keys.map((k, i) => (i === 1 ? { ...k, flagged: true } : k)),
        log: line("bad", "pay(thief.testnet, 6.00) · no proof"),
        seq: s.seq + 1,
      };
    case "trip":
      return {
        ...s,
        phase: "tripped",
        log: line("alarm", "TRIPPED · vault frozen in the same tx"),
        seq: s.seq + 1,
      };
    case "wipe":
      return {
        ...s,
        keys: [],
        log: line("alarm", "DeleteKey × 4 · one block later"),
        seq: s.seq + 1,
      };
    case "retry":
      return {
        ...s,
        log: line("bad", "pay(thief.testnet) · access key does not exist"),
        seq: s.seq + 1,
      };
    case "rearm":
      return {
        ...s,
        phase: "armed",
        epoch: s.epoch + 1,
        keys: keysFor(s.epoch + 1),
        spent: 0,
        log: line("info", `rearm(4 fresh keys) · epoch ${s.epoch + 1}`),
        seq: s.seq + 1,
      };
  }
}

// [delay before the step, action, stop here when the visitor is driving]
const SCRIPT: [number, Action, boolean?][] = [
  [1100, { type: "pay", to: "northwind-data", amount: 0.35 }],
  [1500, { type: "attack" }],
  [900, { type: "trip" }],
  [700, { type: "wipe" }],
  [1300, { type: "retry" }, true],
  [2600, { type: "rearm" }],
  [1400, { type: "pay", to: "acme-hosting", amount: 0.2 }, true],
];
const STEAL_AT = 1;
const REARM_AT = 5;

const TONE: Record<Tone, { icon: typeof Check; cls: string }> = {
  ok: { icon: Check, cls: "text-armed" },
  bad: { icon: X, cls: "text-tripped" },
  alarm: { icon: ShieldAlert, cls: "text-tripped font-medium" },
  info: { icon: RotateCcw, cls: "text-foreground" },
};

export function TripDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10% 0px" });
  const reducedMotion = useReducedMotion();
  const [state, dispatch] = useReducer(reduce, INITIAL);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [driven, setDriven] = useState(false);

  useEffect(() => {
    if (!playing || !inView || (reducedMotion && !driven)) return;
    const [delay, action, stop] = SCRIPT[cursor]!;
    const timer = setTimeout(
      () => {
        dispatch(action);
        if (driven && stop) setPlaying(false);
        setCursor((c) => (c + 1 >= SCRIPT.length ? STEAL_AT : c + 1));
      },
      driven && (cursor === STEAL_AT || cursor === REARM_AT) ? 250 : delay,
    );
    return () => clearTimeout(timer);
  }, [cursor, playing, inView, reducedMotion, driven]);

  const jump = (to: number) => {
    setDriven(true);
    setCursor(to);
    setPlaying(true);
  };
  const busy = playing && driven;
  const tripped = state.phase === "tripped";

  return (
    <div
      ref={ref}
      data-testid="trip-demo"
      className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_60px_-28px_rgb(0_0_0/0.25)]"
    >
      <div className="flex h-14 items-center gap-3 border-b px-4">
        <span className="grid size-8 flex-none place-items-center rounded-md border bg-muted/60">
          <Landmark className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <div className="truncate font-mono text-xs font-medium">vault.telltale.testnet</div>
          <div className="text-[11px] text-muted-foreground tabular-nums">
            epoch {state.epoch} · {state.spent.toFixed(2)} / 2.00 NEAR today
          </div>
        </div>
        <StatusBadge
          state={tripped ? "tripped" : "armed"}
          testId="demo-state"
          className="ml-auto"
        />
      </div>

      <div className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-medium tracking-wide uppercase">Agent keys</span>
          <span className="tabular-nums">{state.keys.length} · pay only</span>
        </div>
        <div className="relative h-[152px]">
          <AnimatePresence initial={false}>
            {state.keys.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute inset-0 grid place-items-center rounded-lg border border-dashed border-tripped/30 bg-tripped-soft/50 text-center text-xs"
              >
                <div>
                  <div className="font-medium text-tripped">Every agent key deleted</div>
                  <div className="mt-0.5 text-muted-foreground">
                    The stolen copy can&apos;t sign anything.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {state.keys.map((k, i) => (
                <motion.li
                  key={`${state.epoch}-${k.id}`}
                  layout
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{
                    opacity: 0,
                    x: -12,
                    transition: { duration: 0.3, delay: i * 0.09, ease: EASE },
                  }}
                  transition={{ duration: 0.4, delay: i * 0.07, ease: EASE }}
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-md border px-2.5 transition-colors duration-300",
                    k.flagged || tripped
                      ? "border-tripped/30 bg-tripped-soft"
                      : "border-border bg-card",
                  )}
                >
                  <KeyRound
                    className={cn("size-3.5", k.flagged ? "text-tripped" : "text-muted-foreground")}
                  />
                  <span
                    className={cn(
                      "font-mono text-xs",
                      tripped && "text-muted-foreground line-through",
                    )}
                  >
                    ed25519:{k.id}
                  </span>
                  <span
                    className={cn(
                      "ml-auto rounded px-1.5 py-px font-mono text-[10px]",
                      k.flagged ? "bg-tripped text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {k.flagged ? "used without proof" : "pay only"}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>

      <div className="flex h-[104px] flex-col justify-end gap-1 overflow-hidden border-t bg-muted/40 px-4 py-2.5 font-mono text-[11px]">
        <AnimatePresence initial={false}>
          {state.log.map((l) => {
            const Icon = TONE[l.tone].icon;
            return (
              <motion.div
                key={l.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className={cn("flex items-center gap-2 truncate", TONE[l.tone].cls)}
              >
                <Icon className="size-3 flex-none" />
                <span className="truncate">{l.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
        <span className="text-[11px] text-muted-foreground">
          {driven ? "You're driving" : "Live demo · simulated vault"}
        </span>
        {tripped ? (
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={busy || state.keys.length > 0}
            onClick={() => jump(REARM_AT)}
            data-testid="demo-rearm"
          >
            <RotateCcw className="size-3" /> Re-arm
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-tripped/30 text-xs text-tripped hover:bg-tripped-soft hover:text-tripped"
            disabled={busy || state.phase === "attack"}
            onClick={() => jump(STEAL_AT)}
            data-testid="demo-steal"
          >
            <KeyRound className="size-3" /> Steal a key
          </Button>
        )}
      </div>
    </div>
  );
}
