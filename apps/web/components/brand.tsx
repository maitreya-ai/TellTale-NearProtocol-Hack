import { cn } from "@/lib/utils";

export type LampState = "armed" | "tripped" | "idle";

export function Lamp({ state, className }: { state: LampState; className?: string }) {
  return (
    <span
      role="img"
      aria-label={state}
      className={cn(
        "lamp size-3",
        state === "armed" ? "lamp-armed" : state === "tripped" ? "lamp-tripped" : "lamp-idle",
        className,
      )}
    />
  );
}

/**
 * The Telltale mark: a key whose bow is the indicator lamp. Same geometry as app/icon.svg.
 * `live` makes the lamp breathe (landing page only).
 */
export function LogoMark({ className, live = false }: { className?: string; live?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 flex-none", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8.5" fill="#0a0a0a" />
      <circle cx="11.25" cy="16" r="5.1" fill="none" stroke="#fafaf9" strokeWidth="2.3" />
      <circle
        cx="11.25"
        cy="16"
        r="2.25"
        fill="var(--brand)"
        className={live ? "logo-lamp-live" : undefined}
      />
      <path
        d="M16.5 16h8.9M21.7 16v3.5M25.4 16v4.4"
        fill="none"
        stroke="#fafaf9"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-semibold tracking-[-0.02em]", className)}>Telltale</span>;
}

export function Logo({ className, tagline = true }: { className?: string; tagline?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="drop-shadow-sm" />
      <div className="leading-tight">
        <Wordmark className="block text-[15px]" />
        {tagline && <div className="text-[11px] text-muted-foreground">Agent key tripwires</div>}
      </div>
    </div>
  );
}
