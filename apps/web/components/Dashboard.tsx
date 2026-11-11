"use client";

import { useCallback, useEffect, useState } from "react";
import type { VaultSnapshot } from "@/lib/types";
import Console from "./Console";
import { accountLink, ago, CAUSE_LABEL, near, shortKey } from "./format";

interface Health {
  mode: "live" | "simulation";
  console: boolean;
  consoleToken: boolean;
  nearAi: boolean;
}

function Lamp({ tripped }: { tripped: boolean }) {
  return (
    <span
      className={`lamp ${tripped ? "tripped" : "armed"}`}
      role="img"
      aria-label={tripped ? "tripped" : "armed"}
    />
  );
}

function Wordmark() {
  return (
    <div className="wordmark">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <circle cx="13" cy="13" r="11" fill="none" stroke="var(--ink)" strokeWidth="2.5" />
        <circle cx="13" cy="13" r="5" fill="var(--brand)" />
      </svg>
      telltale
    </div>
  );
}

export default function Dashboard() {
  const [snap, setSnap] = useState<VaultSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/vault", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        setError(
          body.missing
            ? `Not configured yet: missing ${body.missing.join(", ")}. ${body.hint ?? ""}`
            : body.error,
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

  const tripped = snap?.status.frozen ?? false;
  const lastTrip = snap?.trips[0];
  const agentKeys = snap?.accessKeys.filter((k) => k.permission !== "FullAccess") ?? [];
  const fullKeys = snap?.accessKeys.filter((k) => k.permission === "FullAccess") ?? [];

  return (
    <main className="shell">
      <header className="topbar">
        <Wordmark />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {snap && (
            <span className="chip brand">{snap.mode === "live" ? snap.network : "simulation"}</span>
          )}
          {snap &&
            (accountLink(snap.explorerUrl, snap.vaultId) ? (
              <a
                className="chip"
                href={accountLink(snap.explorerUrl, snap.vaultId)!}
                target="_blank"
                rel="noreferrer"
              >
                {snap.vaultId}
              </a>
            ) : (
              <span className="chip">{snap.vaultId}</span>
            ))}
        </div>
      </header>

      {snap?.mode === "simulation" && (
        <div className="banner" data-testid="sim-banner">
          Simulation mode: the vault runs in memory with the contract&apos;s rules and real ed25519
          proofs. Set <code className="mono">TELLTALE_MOCK=0</code> and the testnet variables to use
          the deployed contract.
        </div>
      )}
      {error && (
        <div className="banner" role="alert">
          {error}
        </div>
      )}

      <section
        className={`panel plate ${tripped ? "tripped" : "armed"}`}
        aria-live="polite"
        data-testid="status-plate"
      >
        <div className="plate-state">
          <Lamp tripped={tripped} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <span className="eyebrow">Vault state</span>
            <span
              className={`state-word ${tripped ? "tripped" : "armed"}`}
              data-testid="state-word"
            >
              {snap ? (tripped ? "TRIPPED" : "ARMED") : "…"}
            </span>
            <span className="quiet">
              {tripped && lastTrip
                ? `${CAUSE_LABEL[lastTrip.cause] ?? lastTrip.cause}. Payments are frozen and ${lastTrip.keysDeleted} agent keys were deleted ${ago(lastTrip.at)}.`
                : "Every agent key is a tripwire. A payment without a signer proof freezes the vault and deletes every key."}
            </span>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="v">{snap?.status.epoch ?? "–"}</div>
            <div className="l">Epoch (re-arms)</div>
          </div>
          <div className="stat">
            <div className="v" data-testid="key-count">
              {snap ? agentKeys.length : "–"}
            </div>
            <div className="l">Live agent keys</div>
          </div>
          <div className="stat">
            <div className="v">{snap ? near(snap.status.available) : "–"}</div>
            <div className="l">NEAR available</div>
          </div>
          <div className="stat">
            <div className="v">
              {snap
                ? `${near(snap.status.spent_in_window)}/${near(snap.config.policy.daily_cap)}`
                : "–"}
            </div>
            <div className="l">Spent today / daily cap</div>
          </div>
          <div className="stat">
            <div className="v">{snap ? near(snap.config.policy.per_payment_cap) : "–"}</div>
            <div className="l">Per-payment cap</div>
          </div>
          <div className="stat">
            <div className="v">
              {snap ? `${snap.status.strikes}/${snap.config.policy.max_strikes}` : "–"}
            </div>
            <div className="l">Strikes</div>
          </div>
        </div>
      </section>

      <div className="cols">
        <section className="panel">
          <h2>Keys on the vault account</h2>
          <div className="keys" data-testid="keys">
            {agentKeys.map((k) => (
              <div className="keyrow" key={k.public_key}>
                <span aria-hidden="true">🔑</span>
                <code title={k.public_key}>{shortKey(k.public_key)}</code>
                <span className="chip">pay only</span>
              </div>
            ))}
            {snap && agentKeys.length === 0 && (
              <div className="empty">
                No agent keys.{" "}
                {lastTrip
                  ? `Trip #${lastTrip.index + 1} deleted ${lastTrip.keysDeleted} keys.`
                  : ""}{" "}
                A stolen key can no longer sign anything. The owner re-arms with fresh keys.
              </div>
            )}
            {fullKeys.map((k) => (
              <div className="keyrow full" key={k.public_key}>
                <span aria-hidden="true">🛠</span>
                <code title={k.public_key}>{shortKey(k.public_key)}</code>
                <span className="chip">deployer, testnet only</span>
              </div>
            ))}
          </div>
          <p className="quiet" style={{ marginTop: 12 }}>
            Each agent key may only call <code className="mono">pay</code> on this vault, and only
            counts with a proof from the Telltale signer. Copies of some keys are planted as bait.
          </p>
        </section>

        <section className="panel">
          <h2>Trip log</h2>
          <div className="trips" data-testid="trips">
            {snap?.trips.length === 0 && (
              <p className="quiet">No trips yet. Run an attack in the console below.</p>
            )}
            {snap?.trips.map((t) => (
              <article className="trip" key={`${t.index}-${t.at}`}>
                <span className="cause">
                  #{t.index + 1} · {CAUSE_LABEL[t.cause] ?? t.cause}
                </span>
                <span className="detail">{t.detail}</span>
                <span className="quiet">
                  {t.keysDeleted} keys deleted · epoch {t.epoch} · {ago(t.at)}
                  {t.blockHeight ? ` · block ${t.blockHeight}` : ""}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <Console
        enabled={health ? health.console : true}
        needsToken={health?.consoleToken ?? false}
        nearAiAvailable={health?.nearAi ?? false}
        explorerUrl={snap?.explorerUrl ?? ""}
        tripped={tripped}
        onChange={refresh}
      />

      <section className="panel">
        <h2>Payments</h2>
        {snap?.payments.length ? (
          <div className="tablebox">
            <table className="pay">
              <thead>
                <tr>
                  <th>#</th>
                  <th>To</th>
                  <th>NEAR</th>
                  <th>Memo</th>
                  <th>Epoch</th>
                </tr>
              </thead>
              <tbody>
                {snap.payments.slice(0, 12).map((p) => (
                  <tr key={p.index}>
                    <td className="mono">{p.index + 1}</td>
                    <td className="mono">{p.receiverId}</td>
                    <td className="mono">{near(p.amount, 4)}</td>
                    <td>{p.memo ?? "–"}</td>
                    <td className="mono">{p.epoch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="quiet">No payments yet.</p>
        )}
      </section>

      <footer className="footer">
        <span>Built at NEAR HACKATHON 2026 · AI Security &amp; Defense</span>
        <a
          href="https://github.com/maitreya-ai/TellTale---NearProtocol---Hack"
          target="_blank"
          rel="noreferrer"
        >
          Source
        </a>
        <span>Contract checks every proof with env::ed25519_verify</span>
      </footer>
    </main>
  );
}
