"use client";

import Lenis from "lenis";
import { motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One easing curve for the whole page: fast out, long settle. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Inertial smooth scrolling for wheel and trackpad. Touch keeps native scrolling. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.09, anchors: { offset: -84 }, autoRaf: true });
    return () => lenis.destroy();
  }, []);
  return null;
}

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Slides a word up from behind a mask. Plays on mount, or on first view with `inView`.
 * The padding keeps italic overhangs and descenders from being clipped.
 */
export function Mask({
  children,
  delay = 0,
  inView = false,
  className,
}: {
  children: ReactNode;
  delay?: number;
  inView?: boolean;
  className?: string;
}) {
  const shown = { y: "0%" };
  return (
    <span
      className={cn(
        "-mx-[0.06em] -mb-[0.14em] inline-block overflow-hidden px-[0.06em] pb-[0.14em] align-bottom",
        className,
      )}
    >
      <motion.span
        className="inline-block will-change-transform"
        initial={{ y: "112%" }}
        {...(inView
          ? { whileInView: shown, viewport: { once: true, margin: "0px 0px -8% 0px" } }
          : { animate: shown })}
        transition={{ duration: 1.05, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-mono text-[11px] font-medium tracking-[0.2em] text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}
