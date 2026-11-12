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
    const lenis = new Lenis({ lerp: 0.1, anchors: { offset: -56 }, autoRaf: true });
    return () => lenis.destroy();
  }, []);
  return null;
}

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Small "+" marks where section rules meet the frame, desktop only. */
export function Corners() {
  const mark = "pointer-events-none absolute z-10 hidden size-[9px] text-zinc-300 xl:block";
  return (
    <>
      <svg viewBox="0 0 9 9" aria-hidden="true" className={cn(mark, "-top-[5px] -left-[5px]")}>
        <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" />
      </svg>
      <svg viewBox="0 0 9 9" aria-hidden="true" className={cn(mark, "-top-[5px] -right-[5px]")}>
        <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" />
      </svg>
    </>
  );
}

/** A full-width section inside the page frame, separated by a hairline. */
export function Section({
  id,
  children,
  className,
  label,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section id={id} aria-label={label} className={cn("relative border-t", className)}>
      <Corners />
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-4 px-5 py-10 sm:px-8 md:flex-row md:items-end md:justify-between md:py-12">
      <Reveal className="max-w-xl">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand" />
          {eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.08} className="max-w-sm">
          <p className="text-[15px] leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
