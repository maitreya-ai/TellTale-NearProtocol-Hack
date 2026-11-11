"use client";

import { useEffect, useRef, useState } from "react";
import type { StreamLine } from "@/lib/types";
import { clock, txLink } from "./format";

const SCENARIOS = [
  {
    id: "honest",
    title: "Honest run",
    summary: "Ledger pays two supplier invoices inside its limits.",
  },
  {
    id: "stolen-env",
    title: "Stolen .env",
    summary: "A malicious skill steals the agent's files. The thief uses a stolen key.",
  },
  {
    id: "poisoned-invoice",
    title: "Poisoned invoice",
    summary: "An invoice tells the agent to raise its own limit and pay a new account.",
  },
] as const;

interface Props {
  enabled: boolean;
  needsToken: boolean;
  nearAiAvailable: boolean;
  explorerUrl: string;
  tripped: boolean;
  onChange: () => void;
}

export default function Console({
  enabled,
  needsToken,
  nearAiAvailable,
  explorerUrl,
  tripped,
  onChange,
}: Props) {
  const [lines, setLines] = useState<StreamLine[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [model, setModel] = useState<"scripted" | "near-ai">("scripted");
  const [token, setToken] = useState("");
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setToken(localStorage.getItem("telltale-console-token") ?? "");
    } catch {
      /* storage blocked */
    }
  }, []);

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [lines]);

  const headers = (): HeadersInit => (token ? { "x-console-token": token } : {});

  function push(line: StreamLine) {
    setLines((prev) => [...prev, line]);
  }

  async function run(id: string) {
    setRunning(id);
    setLines([{ t: Date.now(), actor: "system", level: "info", msg: `▶ ${id}` }]);
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
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.trim()) continue;
          const line = JSON.parse(part) as StreamLine;
          if (line.msg !== "__done__") push(line);
          onChange();
        }
      }
    } catch (e) {
      push({
        t: Date.now(),
        actor: "system",
        level: "warn",
        msg: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setRunning(null);
      onChange();
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
    } finally {
      setRunning(null);
      onChange();
    }
  }

  return (
    <section className="panel" aria-labelledby="console-title">
      <h2 id="console-title">Red-team console</h2>
      <div className="console">
        <div className="scenarios">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="scenario"
              data-testid={`run-${s.id}`}
              disabled={!enabled || running !== null || tripped}
              onClick={() => void run(s.id)}
            >
              <b>{running === s.id ? `Running ${s.title}…` : s.title}</b>
              <span>{s.summary}</span>
            </button>
          ))}
          <label className="field" htmlFor="model">
            Agent model
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value as "scripted" | "near-ai")}
            >
              <option value="scripted">Scripted naive agent (deterministic)</option>
              <option value="near-ai" disabled={!nearAiAvailable}>
                NEAR AI Cloud model{nearAiAvailable ? "" : " (no API key set)"}
              </option>
            </select>
          </label>
          {needsToken && (
            <label className="field" htmlFor="console-token">
              Console token
              <input
                id="console-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </label>
          )}
          <button
            type="button"
            className="btn"
            data-testid="rearm"
            disabled={!enabled || running !== null || !tripped}
            onClick={() => void rearm()}
          >
            {running === "rearm" ? "Re-arming…" : "Re-arm vault (owner)"}
          </button>
          {!enabled && (
            <p className="quiet">The console is off. Set TELLTALE_DEMO=1 to enable it.</p>
          )}
          {tripped && enabled && (
            <p className="quiet">The vault is tripped. Re-arm it to run another scenario.</p>
          )}
        </div>
        <div className="terminal" ref={termRef} data-testid="terminal" aria-live="polite">
          {lines.length === 0 && (
            <div className="line">
              <span className="time">--:--:--</span>
              <span className="who system">idle</span>
              <span className="msg">
                Pick a scenario. Each one runs against the vault and streams here.
              </span>
            </div>
          )}
          {lines.map((line, i) => {
            const href = line.tx ? txLink(explorerUrl, line.tx) : null;
            return (
              <div className={`line ${line.level}`} key={i}>
                <span className="time">{clock(line.t)}</span>
                <span className={`who ${line.actor}`}>{line.actor}</span>
                <span className="msg">
                  {line.msg}
                  {href && (
                    <>
                      {" "}
                      <a href={href} target="_blank" rel="noreferrer">
                        tx ↗
                      </a>
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
