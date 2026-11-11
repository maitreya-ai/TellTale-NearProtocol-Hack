"use client";

import {
  ExternalLink,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { PageHeader } from "./app-shell";
import { Lamp } from "./brand";
import { clock, txLink } from "./format";
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

type ModelChoice = "scripted" | "near-ai";
type RunResult = { tripped?: boolean; paid?: number };

const ACTOR_STYLE: Record<string, string> = {
  system: "bg-muted text-muted-foreground",
  agent: "bg-sky-50 text-sky-700",
  tool: "bg-sky-50 text-sky-700",
  signer: "bg-sky-50 text-sky-700",
  vault: "bg-violet-50 text-violet-700",
  telltale: "bg-amber-50 text-amber-800",
  skill: "bg-rose-50 text-rose-700",
  attacker: "bg-rose-50 text-rose-700",
};

const LEVEL_STYLE: Record<string, string> = {
  info: "text-foreground",
  ok: "text-armed",
  warn: "text-amber-700",
  alarm: "text-tripped font-semibold",
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
      className="h-[440px] overflow-y-auto rounded-lg border bg-[#fcfcfb] p-3 font-mono text-[12.5px] leading-relaxed"
    >
      {lines.length === 0 && (
        <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
          <div className="space-y-2">
            <TerminalSquare className="mx-auto size-6" />
            <p>Pick a scenario. Each run streams here and lands on-chain.</p>
          </div>
        </div>
      )}
      {lines.map((line, i) => {
        const href = line.tx ? txLink(explorerUrl, line.tx) : null;
        return (
          <div
            key={i}
            className="grid grid-cols-[64px_74px_minmax(0,1fr)] items-start gap-2 py-0.5 sm:grid-cols-[72px_84px_minmax(0,1fr)]"
          >
            <span className="text-muted-foreground tabular-nums">{clock(line.t)}</span>
            <span
              className={cn(
                "mt-0.5 justify-self-start rounded px-1.5 text-[10px] font-medium tracking-wide uppercase",
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
                  className="ml-2 inline-flex items-center gap-0.5 text-sky-700 underline-offset-2 hover:underline"
                >
                  tx <ExternalLink className="size-3" />
                </a>
              )}
            </span>
          </div>
        );
      })}
      {running && (
        <div className="flex items-center gap-2 py-1 text-muted-foreground">
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

  return (
    <>
      <PageHeader
        title="Attack lab"
        description="Run real attacks against the vault. Every step streams below, and on testnet each trip is a transaction you can open on NearBlocks."
      />
      <Notices />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          const busy = running === s.id;
          return (
            <Card key={s.id} className="justify-between gap-4">
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-lg border bg-muted">
                    <Icon className="size-4" />
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px]",
                      s.tone === "armed"
                        ? "border-armed/30 text-armed"
                        : "border-tripped/30 text-tripped",
                    )}
                  >
                    {s.expect}
                  </Badge>
                </div>
                <CardTitle className="text-base">{s.title}</CardTitle>
                <CardDescription>{s.summary}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={s.id === "honest" ? "outline" : "default"}
                  data-testid={`run-${s.id}`}
                  disabled={!enabled || running !== null || tripped}
                  onClick={() => void run(s.id, s.title)}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  {busy ? "Running…" : "Run scenario"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Controls</CardTitle>
            <CardDescription>Owner actions are testnet-only demo powers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
              <Lamp state={snap ? (tripped ? "tripped" : "armed") : "idle"} />
              <div className="min-w-0">
                <div
                  data-testid="lab-state"
                  className={cn("text-sm font-semibold", tripped ? "text-tripped" : "text-armed")}
                >
                  {snap ? (tripped ? "TRIPPED" : "ARMED") : "…"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {snap
                    ? `Epoch ${snap.status.epoch} · ${snap.status.managed_key_count} agent keys`
                    : "Connecting"}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Agent model</Label>
              <Select value={model} onValueChange={(v) => setModel(v as ModelChoice)}>
                <SelectTrigger id="model" className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scripted">Scripted naive agent</SelectItem>
                  <SelectItem value="near-ai" disabled={!health?.nearAi}>
                    NEAR AI Cloud model{health?.nearAi ? "" : " (no API key)"}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The scripted agent follows invoice instructions every time, so runs are repeatable.
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
            <Button
              className="w-full"
              variant={tripped ? "default" : "outline"}
              data-testid="rearm"
              disabled={!enabled || running !== null || !tripped}
              onClick={() => void rearm()}
            >
              {running === "rearm" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              {running === "rearm" ? "Re-arming…" : "Re-arm vault (owner)"}
            </Button>
            {!enabled && (
              <p className="text-xs text-muted-foreground">
                The console is off. Set TELLTALE_DEMO=1 to enable it.
              </p>
            )}
            {tripped && enabled && (
              <p className="text-xs text-muted-foreground">
                The vault is tripped. Re-arm it to run another scenario.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-base">Live log</CardTitle>
              <CardDescription>
                Agent, skill, attacker and vault events as they happen.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={lines.length === 0 || running !== null}
              onClick={() => setLines([])}
            >
              <Trash2 className="size-4" /> Clear
            </Button>
          </CardHeader>
          <CardContent>
            <Terminal
              lines={lines}
              explorerUrl={explorerUrl}
              running={running !== null && running !== "rearm"}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
