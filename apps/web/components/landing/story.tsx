"use client";

import { Bomb, KeyRound, Snowflake } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { EASE, Eyebrow } from "./motion";

type Stage = 0 | 1 | 2 | 3;

const STAGES = [
  {
    title: "Armed.",
    body: "Agents never hold keys. A signer pays for them, with a proof bound to each key.",
    event: "pay(acme-hosting, 0.20) · proof ✓",
  },
  {
    title: "Caught.",
    body: "A key used without that proof, or an agent reaching for a decoy tool. Either one is the alarm.",
    event: "pay(thief.testnet, 6.00) · no proof",
  },
  {
    title: "Tripped.",
    body: "Frozen in the same transaction. Every agent key deleted a block later.",
    event: "frozen · DeleteKey × 4",
  },
  {
    title: "Re-armed.",
    body: "One owner transaction. Fresh keys, next epoch.",
    event: "rearm([4 keys]) · epoch 1",
  },
] as const;

// Positions on a 100 × 100 grid; the keys sit on the wire ring (r = 36).
const KEY_SPOTS = [
  { x: 50, y: 14 },
  { x: 86, y: 50 },
  { x: 50, y: 86 },
  { x: 14, y: 50 },
];
const KEYS_EPOCH_0 = ["7HkQ…q2Fa", "B3nx…9TcL", "Ex4r…mW1d", "Kp8z…Zu5e"];
const KEYS_EPOCH_1 = ["Q9ws…Lr3b", "Ht2m…x8Kc", "Mv6p…Ae0n", "Zc1y…Wd7s"];
const THIEF = { x: 25, y: 25 };
const DECOY = { x: 75, y: 75 };

const ARMED = "#059669";
const TRIPPED = "#dc2626";

function TripDiagram({ stage, progress }: { stage: Stage; progress: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const ringRotate = useTransform(progress, [0, 1], [0, reduce ? 0 : 140]);
  const tripped = stage === 2;
  const threats = stage === 1 || stage === 2;
  const keys = stage === 2 ? [] : stage === 3 ? KEYS_EPOCH_1 : KEYS_EPOCH_0;
  const color = tripped ? TRIPPED : ARMED;

  return (
    <div className="@container relative aspect-square w-full select-none" aria-hidden="true">
      {/* Glow behind the orb, green or red. */}
      <motion.div
        className="absolute top-1/2 left-1/2 size-[86cqw] -translate-x-1/2 -translate-y-1/2 rounded-full"
        animate={{
          background: `radial-gradient(closest-side, ${tripped ? "rgb(220 38 38 / 0.22)" : "rgb(5 150 105 / 0.14)"}, transparent)`,
          scale: tripped ? [1, 1.06, 1] : 1,
        }}
        transition={{
          background: { duration: 0.6 },
          scale: tripped ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : undefined,
        }}
      />

      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
        <circle
          cx="50"
          cy="50"
          r="36"
          fill="none"
          stroke="rgb(10 10 10 / 0.09)"
          strokeWidth="0.3"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="26"
          fill="none"
          stroke="rgb(10 10 10 / 0.14)"
          strokeWidth="0.3"
          strokeDasharray="0.6 1.6"
          style={{ rotate: ringRotate }}
        />

        {/* Spokes from each key to the vault. */}
        {KEY_SPOTS.map((s, i) => (
          <motion.line
            key={i}
            x1={s.x}
            y1={s.y}
            x2="50"
            y2="50"
            stroke="rgb(10 10 10 / 0.14)"
            strokeWidth="0.3"
            initial={false}
            animate={{ opacity: keys.length ? 1 : 0 }}
            transition={{ duration: 0.4, delay: keys.length ? 0.2 : i * 0.12 }}
          />
        ))}

        {/* Proof-carrying calls travelling into the vault while armed. */}
        {!threats &&
          !reduce &&
          KEY_SPOTS.map((s, i) => (
            <motion.circle
              key={`sig-${stage}-${i}`}
              r="0.9"
              fill={ARMED}
              initial={{ cx: s.x, cy: s.y, opacity: 0 }}
              animate={{
                cx: [s.x, 50 + (s.x - 50) * 0.5],
                cy: [s.y, 50 + (s.y - 50) * 0.5],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                repeatDelay: 1.2,
                delay: 0.5 + i * 0.7,
                ease: "easeIn",
              }}
            />
          ))}

        {/* Attack wires. */}
        <AnimatePresence>
          {threats &&
            [THIEF, DECOY].map((t, i) => (
              <motion.line
                key={`wire-${i}`}
                x1={t.x}
                y1={t.y}
                x2="50"
                y2="50"
                stroke={TRIPPED}
                strokeWidth="0.45"
                strokeDasharray="1.5 1.5"
                className="wire-flow"
                initial={{ opacity: 0 }}
                animate={{ opacity: tripped ? 0.35 : 0.9 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.15 + i * 0.15 }}
              />
            ))}
        </AnimatePresence>

        {/* Impact ripples when the bad call lands. */}
        {stage === 1 &&
          !reduce &&
          [0, 1].map((i) => (
            <motion.circle
              key={`ripple-${i}`}
              cx="50"
              cy="50"
              fill="none"
              stroke={TRIPPED}
              strokeWidth="0.35"
              initial={{ r: 17, opacity: 0 }}
              animate={{ r: [17, 31], opacity: [0.6, 0] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: 0.8 + i * 0.9,
                ease: "easeOut",
              }}
            />
          ))}
      </svg>

      {/* The vault. */}
      <div className="absolute top-1/2 left-1/2 flex size-[34cqw] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-black/7 bg-white shadow-[0_30px_80px_-30px_rgb(0_0_0/0.35),0_2px_6px_rgb(0_0_0/0.04)]">
        <motion.div
          className="relative size-[11cqw] rounded-full"
          animate={{
            backgroundColor: color,
            boxShadow: `0 0 0 1.4cqw ${tripped ? "#fef2f2" : "#ecfdf5"}, 0 0 5cqw ${tripped ? "rgb(220 38 38 / 0.55)" : "rgb(5 150 105 / 0.4)"}`,
            scale: tripped ? [1, 1.08, 1] : 1,
          }}
          transition={{
            duration: 0.5,
            scale: tripped ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : undefined,
          }}
        >
          <span className="absolute top-[18%] left-[20%] size-[34%] rounded-full bg-white/55 blur-[0.4cqw]" />
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.div
            key={tripped ? "t" : "a"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "mt-[2.6cqw] text-[length:max(13px,3.3cqw)] leading-none font-semibold tracking-tight",
              tripped ? "text-tripped" : "text-armed",
            )}
          >
            {tripped ? "TRIPPED" : "ARMED"}
          </motion.div>
        </AnimatePresence>
        <div className="mt-[1.2cqw] font-mono text-[length:max(10px,2.1cqw)] text-muted-foreground">
          epoch {stage === 3 ? 1 : 0}
        </div>
      </div>

      {/* Agent keys on the ring. */}
      <AnimatePresence>
        {keys.map((id, i) => (
          <motion.div
            key={id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${KEY_SPOTS[i]!.x}%`, top: `${KEY_SPOTS[i]!.y}%` }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: [1, 1, 0],
              scale: [1, 1.08, 0.5],
              filter: ["blur(0px)", "blur(0px)", "blur(4px)"],
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.15 + i * 0.08,
              opacity: { duration: 0.6, delay: i * 0.14 },
              scale: { duration: 0.6, delay: i * 0.14 },
              filter: { duration: 0.6, delay: i * 0.14 },
            }}
          >
            <div
              className={cn(
                "flex items-center gap-[1.2cqw] rounded-full border bg-white py-[1.3cqw] pr-[2.2cqw] pl-[1.6cqw] font-mono text-[length:max(10px,2.35cqw)] whitespace-nowrap shadow-[0_10px_30px_-14px_rgb(0_0_0/0.35)] transition-colors duration-300",
                stage === 1 ? "border-tripped/25" : "border-black/8",
              )}
            >
              <KeyRound className="size-[max(11px,2.6cqw)] text-muted-foreground" />
              {id}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Threats. */}
      <AnimatePresence>
        {threats && (
          <motion.div
            key="thief"
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${THIEF.x}%`, top: `${THIEF.y}%` }}
            initial={{ opacity: 0, x: "-30%", scale: 0.9 }}
            animate={{ opacity: 1, x: "0%", scale: 1 }}
            exit={{ opacity: 0, x: "-30%" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <ThreatChip
              tone={tripped ? "dead" : "tripped"}
              icon={<KeyRound className="size-[max(11px,2.6cqw)]" />}
              label="Stolen key"
              value={tripped ? "access key does not exist" : "pay() · no proof"}
            />
          </motion.div>
        )}
        {threats && (
          <motion.div
            key="decoy"
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${DECOY.x}%`, top: `${DECOY.y}%` }}
            initial={{ opacity: 0, x: "30%", scale: 0.9 }}
            animate={{ opacity: 1, x: "0%", scale: 1 }}
            exit={{ opacity: 0, x: "30%" }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.12 }}
          >
            <ThreatChip
              tone={tripped ? "dead" : "brand"}
              icon={<Bomb className="size-[max(11px,2.6cqw)]" />}
              label="Hijacked agent"
              value="raise_spending_limit()"
            />
          </motion.div>
        )}
        {tripped && (
          <motion.div
            key="frozen"
            className="absolute top-[71%] left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
          >
            <div className="flex items-center gap-[1cqw] rounded-full bg-tripped px-[2.2cqw] py-[1cqw] font-mono text-[length:max(10px,2.1cqw)] whitespace-nowrap text-white shadow-[0_10px_30px_-10px_rgb(220_38_38/0.7)]">
              <Snowflake className="size-[max(11px,2.3cqw)]" />
              Frozen
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThreatChip({
  tone,
  icon,
  label,
  value,
}: {
  tone: "tripped" | "brand" | "dead";
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-[1.6cqw] rounded-[2.4cqw] border bg-white py-[1.4cqw] pr-[2.4cqw] pl-[1.4cqw] whitespace-nowrap shadow-[0_16px_40px_-18px_rgb(0_0_0/0.4)] transition-[opacity,border-color] duration-500",
        tone === "tripped" && "border-tripped/40",
        tone === "brand" && "border-amber-400/50",
        tone === "dead" && "border-black/6 opacity-60",
      )}
    >
      <span
        className={cn(
          "grid size-[max(22px,5.4cqw)] place-items-center rounded-[1.4cqw]",
          tone === "tripped" && "bg-tripped-soft text-tripped",
          tone === "brand" && "bg-brand-soft text-amber-600",
          tone === "dead" && "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <div>
        <div className="text-[length:max(8px,1.8cqw)] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </div>
        <div
          className={cn(
            "font-mono text-[length:max(9.5px,2.3cqw)]",
            tone === "dead" && "line-through",
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function RailSegment({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const scaleX = useTransform(progress, [index / 4, (index + 1) / 4], [0, 1]);
  return (
    <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-black/7">
      <motion.div style={{ scaleX }} className="h-full origin-left rounded-full bg-foreground" />
    </div>
  );
}

export function Story() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [stage, setStage] = useState<Stage>(0);
  useMotionValueEvent(p, "change", (v) => {
    const next = Math.min(3, Math.max(0, Math.floor(v * 4))) as Stage;
    setStage((s) => (s === next ? s : next));
  });
  const step = STAGES[stage];

  return (
    <section
      id="how"
      ref={ref}
      aria-label="How it trips"
      data-testid="story"
      data-stage={stage}
      className="relative h-[420vh]"
    >
      <div className="sticky top-0 flex h-[100svh] items-center overflow-clip pt-16 md:pt-0">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-4 px-4 sm:px-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-14">
          <div className="order-2 md:order-1">
            <Eyebrow>How it trips</Eyebrow>
            <div className="mt-4 flex max-w-xs gap-1.5 md:mt-5">
              {STAGES.map((s, i) => (
                <RailSegment key={s.title} progress={p} index={i} />
              ))}
            </div>
            <div className="relative mt-5 min-h-[13.5rem] md:mt-9 md:min-h-[19rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <div className="font-mono text-sm text-muted-foreground">
                    0{stage + 1} <span className="text-black/25">/ 04</span>
                  </div>
                  <h3
                    data-testid="story-title"
                    className={cn(
                      "mt-2 font-serif text-[clamp(2.75rem,7vw,6rem)] leading-none tracking-tight md:mt-3",
                      stage === 2 && "text-tripped italic",
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-pretty text-muted-foreground md:mt-5 md:text-lg">
                    {step.body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="order-1 mx-auto w-full max-w-[min(100%,50svh)] md:order-2 md:max-w-[36rem]">
            <TripDiagram stage={stage} progress={p} />
            <div className="mt-1 flex justify-center md:mt-3">
              <AnimatePresence mode="wait">
                <motion.code
                  key={stage}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "rounded-full border bg-white px-3.5 py-1.5 font-mono text-[11px] whitespace-nowrap shadow-sm sm:text-xs",
                    stage === 1 || stage === 2
                      ? "border-tripped/30 text-tripped"
                      : "border-black/8 text-muted-foreground",
                  )}
                >
                  {step.event}
                </motion.code>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
