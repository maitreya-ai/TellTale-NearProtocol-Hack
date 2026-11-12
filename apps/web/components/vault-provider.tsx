"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { VaultSnapshot } from "@/lib/types";

export interface Health {
  mode: "live" | "simulation";
  console: boolean;
  consoleToken: boolean;
  /** Live LLM label such as "Groq · openai/gpt-oss-120b", or null. */
  llm: string | null;
}

interface VaultContextValue {
  snap: VaultSnapshot | null;
  health: Health | null;
  error: string | null;
  refresh: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

/** Polls /api/vault so every page and the sidebar share one live snapshot. */
export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [snap, setSnap] = useState<VaultSnapshot | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/vault", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        setError(
          body.missing
            ? `Not configured yet: missing ${body.missing.join(", ")}. ${body.hint ?? ""}`
            : String(body.error ?? res.status),
        );
        return;
      }
      setSnap(body as VaultSnapshot);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => undefined);
    const timer = setInterval(() => void refresh(), 4000);
    return () => clearInterval(timer);
  }, [refresh]);

  const value = useMemo(() => ({ snap, health, error, refresh }), [snap, health, error, refresh]);
  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const value = useContext(VaultContext);
  if (!value) throw new Error("useVault must be used inside <VaultProvider>");
  return value;
}
