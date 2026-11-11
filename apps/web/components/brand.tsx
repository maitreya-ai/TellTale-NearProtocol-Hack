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

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-foreground shadow-sm">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="#fafaf9" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="3" fill="var(--brand)" />
        </svg>
      </span>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight">Telltale</div>
        <div className="text-[11px] text-muted-foreground">Agent key tripwires</div>
      </div>
    </div>
  );
}
