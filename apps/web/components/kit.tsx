"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Page title row: title + one-line description, actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small heading above a card or block, Vercel-settings style. */
export function SectionTitle({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Copy"
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            });
          }}
          className={cn(
            "inline-grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            className,
          )}
        >
          {copied ? <Check className="size-3.5 text-armed" /> : <Copy className="size-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
    </Tooltip>
  );
}

/** A row of metrics inside one bordered surface, separated by hairlines. */
export function StatGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-px bg-border lg:grid-cols-4", className)}>
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  hint,
  progress,
  tone,
  testId,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  progress?: number;
  tone?: "armed" | "tripped";
  testId?: string;
}) {
  return (
    <div className="min-w-0 bg-card px-4 py-4 sm:px-5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span
          data-testid={testId}
          className={cn(
            "text-2xl font-semibold tracking-tight tabular-nums",
            tone === "tripped" && "text-tripped",
          )}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {progress !== undefined && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700",
              progress >= 100 ? "bg-tripped" : progress >= 66 ? "bg-amber-500" : "bg-foreground",
            )}
            style={{ width: `${Math.max(progress, progress > 0 ? 3 : 0)}%` }}
          />
        </div>
      )}
      {hint && <div className="mt-2 truncate text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-9 place-items-center rounded-lg border bg-card text-muted-foreground shadow-xs">
        {icon}
      </span>
      <div className="text-sm font-medium">{title}</div>
      {description && (
        <p className="max-w-xs text-sm text-pretty text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
