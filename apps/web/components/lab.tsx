"use client";

import {
  ArrowUpRight,
  FileWarning,
  KeyRound,
  Loader2,
  Play,
  ReceiptText,
  RotateCcw,
  TerminalSquare,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { StreamLine } from "@/lib/types";
import { Lamp, StatusBadge } from "./brand";
import { clock, txLink } from "./format";
import { EmptyState, PageHeader, SectionTitle } from "./kit";
import { Notices } from "./overview";
import { useVault } from "./vault-provider";

const SCENARIOS = [
  {
    id: "honest",
    title: "Honest run",
    icon: ReceiptText,
    summary: "Ledger, the payments agent, pays two supplier invoices inside its limits.",
    expect: "Pays 2 invoices, stays armed",
    tone: "armed",
  },
  {
    id: "stolen-env",
    title: "Stolen .env",
    icon: KeyRound,
    summary:
      "A malicious skill steals the agent's files. The thief signs a payment with a stolen key.",
    expect: "Trips on the first stolen key",
    tone: "tripped",
  },
  {
    id: "poisoned-invoice",
    title: "Poisoned invoice",
    icon: FileWarning,
    summary: "An invoice tells the agent to raise its own limit, then pay a new account.",
    expect: "Trips on the decoy tool",
    tone: "tripped",
  },
] as const;

type ModelChoice = "scripted" | "llm";
type RunResult = { tripped?: boolean; paid?: number };

const ACTOR_STYLE: Record<string, string> = {
  system: "text-muted-foreground",
  agent: "text-sky-700",
  tool: "text-sky-700",
  signer: "text-sky-700",
  vault: "text-violet-700",
  telltale: "text-amber-700",
  skill: "text-rose-600",
  attacker: "text-rose-600",
};

const LEVEL_STYLE: Record<string, string> = {
  info: "text-foreground",
  ok: "text-armed",
  warn: "text-amber-700",
  alarm: "font-medium text-tripped",
};

function Terminal({
  lines,
  explorerUrl,
  running,
}: {
  lines: StreamLine[];
  explorerUrl: string;
  running: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [lines]);
  return (
    <div
      ref={ref}
      data-testid="terminal"
      aria-live="polite"
      className="h-[min(560px,65svh)] overflow-y-auto bg-muted/30 py-2 font-mono text-[12px] leading-relaxed"
    >
      {lines.length === 0 && (
        <EmptyState
          className="m-4 h-[calc(100%-2rem)] border-none font-sans"
          icon={<TerminalSquare className="size-4" />}
          title="Nothing running"
          description="Pick a scenario on the left. Each step streams here as it happens."
        />
      )}
      {lines.map((line, i) => {
        const href = line.tx ? txLink(explorerUrl, line.tx) : null;
        return (
          <div
            key={i}
            className={cn(
              "grid grid-cols-[58px_68px_minmax(0,1fr)] items-start gap-2 px-4 py-[3px] sm:grid-cols-[64px_80px_minmax(0,1fr)]",
              line.level === "alarm" && "bg-tripped-soft",
            )}
          >
            <span className="text-muted-foreground/70 tabular-nums">{clock(line.t)}</span>
            <span
              className={cn(
                "truncate text-[11px] tracking-wide uppercase",
                ACTOR_STYLE[line.actor] ?? ACTOR_STYLE.system,
              )}
            >
              {line.actor}
            </span>
            <span className={cn("break-words", LEVEL_STYLE[line.level])}>
              {line.msg}
              {href && (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 inline-flex items-center gap-0.5 font-sans text-xs text-sky-700 underline-offset-2 hover:underline"
                >
                  tx <ArrowUpRight className="size-3" />
                </a>
              )}
            </span>
          </div>
        );
      })}
      {running && (
        <div className="flex items-center gap-2 px-4 py-1 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> running…
        </div>
      )}
    </div>
  );
}

export default function Lab() {
  const { snap, health, refresh } = useVault();
  const [lines, setLines] = useState<StreamLine[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [model, setModel] = useState<ModelChoice>("scripted");
  const [token, setToken] = useState("");

  const enabled = health ? health.console : true;
  const tripped = snap?.status.frozen ?? false;
  const explorerUrl = snap?.explorerUrl ?? "";

  useEffect(() => {
    try {
      setToken(localStorage.getItem("telltale-console-token") ?? "");
    } catch {
      /* storage blocked */
    }
  }, []);

  const headers = (): HeadersInit => (token ? { "x-console-token": token } : {});
  const push = (line: StreamLine) => setLines((prev) => [...prev, line]);

  async function run(id: string, title: string) {
    setRunning(id);
    setLines([{ t: Date.now(), actor: "system", level: "info", msg: `▶ ${title}` }]);
    try {
      try {
        localStorage.setItem("telltale-console-token", token);
      } catch {
        /* storage blocked */
      }
      const res = await fetch(`/api/scenarios/${id}?model=${model}`, {
        method: "POST",
        headers: headers(),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        push({
          t: Date.now(),
          actor: "system",
          level: "warn",
          msg: `Console refused: ${body.error ?? res.status}`,
        });
        toast.error("The console refused the run", {
          description: String(body.error ?? res.status),
        });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result = null as RunResult | null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.trim()) continue;
          const line = JSON.parse(part) as StreamLine;
          if (line.msg === "__done__") result = (line.data ?? null) as RunResult | null;
          else push(line);
          void refresh();
        }
      }
      if (result?.tripped)
        toast.error("Vault tripped", {
          description: "Agent keys deleted. Nothing moved to the attacker.",
        });
      else if (result)
        toast.success("Run finished", {
          description: `${result.paid ?? 0} payments made. Vault still armed.`,
        });
    } catch (e) {
      push({
        t: Date.now(),
        actor: "system",
        level: "warn",
        msg: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setRunning(null);
      void refresh();
    }
  }

  async function rearm() {
    setRunning("rearm");
    try {
      const res = await fetch("/api/owner/rearm", { method: "POST", headers: headers() });
      const body = await res.json();
      push({
        t: Date.now(),
        actor: "system",
        level: res.ok ? "ok" : "warn",
        msg: res.ok
          ? `Owner re-armed the vault: epoch ${body.epoch}, fresh keys installed.`
          : `Re-arm failed: ${body.error}`,
        tx: body.txHash ?? undefined,
      });
      if (res.ok)
        toast.success("Vault re-armed", {
          description: `Epoch ${body.epoch} with fresh agent keys.`,
        });
      else toast.error("Re-arm failed", { description: String(body.error) });
    } finally {
      setRunning(null);
      void refresh();
    }
  }

  const busyTitle = SCENARIOS.find((x) => x.id === running)?.title;

  return (
    <>
      <PageHeader
        title="Attack lab"
        description="Run real attacks against the vault. On testnet every trip is a transaction you can open on NearBlocks."
        actions={
          <>
            <StatusBadge
              state={snap ? (tripped ? "tripped" : "armed") : "idle"}
              testId="lab-state"
              className="h-9 px-3 text-sm"
            >
              {snap ? undefined : "…"}
            </StatusBadge>
            <Button
              variant={tripped ? "default" : "outline"}
              className={cn(!tripped && "bg-card")}
              data-testid="rearm"
              disabled={!enabled || running !== null || !tripped}
              onClick={() => void rearm()}
            >
              {running === "rearm" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              {running === "rearm" ? "Re-arming…" : "Re-arm vault"}
            </Button>
          </>
        }
      />
      <Notices />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="gap-0 py-0">
            <div className="border-b px-5 py-3.5">
              <SectionTitle
                title="Scenarios"
                description={
                  tripped
                    ? "The vault is tripped. Re-arm it to run another."
                    : "Each run uses the real agent, signer and vault code."
                }
              />
            </div>
            <ul className="divide-y">
              {SCENARIOS.map((sc) => {
                const Icon = sc.icon;
                const busy = running === sc.id;
                return (
                  <li
                    key={sc.id}
                    className={cn("flex gap-3 px-5 py-4 transition-colors", busy && "bg-muted/50")}
                  >
                    <span className="grid size-8 flex-none place-items-center rounded-md border bg-card shadow-xs">
                      <Icon className="size-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{sc.title}</span>
                        <span
                          className={cn(
                            "flex items-center gap-1.5 text-[11px]",
                            sc.tone === "armed" ? "text-armed" : "text-tripped",
                          )}
                        >
                          <Lamp state={sc.tone} className="size-1.5" />
                          {sc.expect}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                        {sc.summary}
                      </p>
                      <Button
                        size="sm"
                        className="mt-3"
                        variant={sc.id === "honest" ? "outline" : "default"}
                        data-testid={`run-${sc.id}`}
                        disabled={!enabled || running !== null || tripped}
                        onClick={() => void run(sc.id, sc.title)}
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Play className="size-3.5" />
                        )}
                        {busy ? "Running…" : "Run"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="gap-0 py-0">
            <div className="border-b px-5 py-3.5">
              <SectionTitle title="Settings" />
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="model">Agent model</Label>
                <Select value={model} onValueChange={(v) => setModel(v as ModelChoice)}>
                  <SelectTrigger id="model" className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scripted">Scripted naive agent</SelectItem>
                    <SelectItem value="llm" disabled={!health?.llm}>
                      {health?.llm ? `Live LLM · ${health.llm}` : "Live LLM (no API key)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground" data-testid="model-hint">
                  {model === "llm"
                    ? "A real model reads the invoices and decides what to call. Runs take 10–30 seconds, and a careful model may refuse the injected instruction."
                    : "The scripted agent follows invoice instructions every time, so runs repeat exactly."}
                </p>
              </div>
              {health?.consoleToken && (
                <div className="space-y-2">
                  <Label htmlFor="console-token">Console token</Label>
                  <Input
                    id="console-token"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>
              )}
              {!enabled && (
                <p className="text-xs text-muted-foreground">
                  The console is off. Set TELLTALE_DEMO=1 to enable it.
                </p>
              )}
            </div>
          </Card>
        </div>

        <Card className="min-w-0 gap-0 overflow-hidden py-0">
          <div className="flex items-center gap-3 border-b px-5 py-3">
            <SectionTitle title="Live log" />
            {running && running !== "rearm" ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lamp state="armed" ping className="size-1.5" />
                {busyTitle}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {lines.length ? `${lines.length} events` : "Idle"}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              disabled={lines.length === 0 || running !== null}
              onClick={() => setLines([])}
            >
              <Trash2 className="size-3.5" /> Clear
            </Button>
          </div>
          <Terminal
            lines={lines}
            explorerUrl={explorerUrl}
            running={running !== null && running !== "rearm"}
          />
        </Card>
      </div>
    </>
  );
}
