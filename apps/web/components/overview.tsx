"use client";

import {
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  FlaskConical,
  KeyRound,
  Landmark,
  ReceiptText,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { VaultSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActivityChart } from "./activity-chart";
import { Lamp } from "./brand";
import { fmtNear, vaultEvents } from "./events";
import { accountLink, ago, CAUSE_LABEL, near, pct, shortKey } from "./format";
import { CopyButton, EmptyState, PageHeader } from "./kit";
import { useVault } from "./vault-provider";

function Kpi({
  label,
  icon: Icon,
  children,
  footer,
  className,
}: {
  label: string;
  icon: LucideIcon;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 px-5 py-4", className)}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        <Icon className="size-4" />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{children}</div>
      {footer && <div className="mt-1.5 text-xs text-muted-foreground">{footer}</div>}
    </Card>
  );
}

/** Card with a title row (and optional link) above flush content. */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  testId,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <Card className={cn("min-w-0 gap-0 py-0", className)}>
      <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div data-testid={testId} className="min-w-0">
        {children}
      </div>
    </Card>
  );
}

export function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="-mt-1 -mr-2 h-7 text-xs">
      <Link href={href}>
        {label} <ArrowRight className="size-3.5" />
      </Link>
    </Button>
  );
}

function TrippedBanner({ snap }: { snap: VaultSnapshot }) {
  const trip = snap.trips[0];
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-tripped/25 bg-tripped-soft px-4 py-3 sm:flex-row sm:items-center">
      <span className="grid size-8 flex-none place-items-center rounded-md bg-tripped text-white">
        <ShieldAlert className="size-4" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium text-tripped">
          Vault tripped{trip ? ` ${ago(trip.at)}` : ""}
        </div>
        <div className="text-foreground/75">
          {trip ? `${CAUSE_LABEL[trip.cause] ?? trip.cause}. ` : ""}Payments are frozen and{" "}
          {trip ? trip.keysDeleted : "all"} agent keys were deleted. Funds are safe.
        </div>
      </div>
      <Button size="sm" asChild>
        <Link href="/lab">
          <RotateCcw className="size-3.5" /> Re-arm vault
        </Link>
      </Button>
    </div>
  );
}

function AlertsFeed({ snap }: { snap: VaultSnapshot }) {
  if (snap.trips.length === 0)
    return (
      <div className="flex items-center gap-2.5 px-5 pb-5 text-sm text-muted-foreground">
        <CircleCheck className="size-4 text-armed" />
        No trips yet. Every payment carried a valid proof.
      </div>
    );
  return (
    <ul className="divide-y border-t">
      {snap.trips.slice(0, 4).map((t) => (
        <li key={`${t.index}-${t.at}`} className="flex gap-3 px-5 py-3">
          <span className="mt-0.5 grid size-7 flex-none place-items-center rounded-md bg-tripped-soft text-tripped">
            <ShieldAlert className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium">
                {CAUSE_LABEL[t.cause] ?? t.cause}
              </span>
              <span className="flex-none text-xs text-muted-foreground">{ago(t.at)}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Trip #{t.index + 1} · {t.keysDeleted} keys deleted · epoch {t.epoch}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RecentPayments({ snap }: { snap: VaultSnapshot }) {
  const payments = vaultEvents(snap)
    .filter((e) => e.kind === "payment")
    .slice(0, 5);
  if (payments.length === 0)
    return (
      <EmptyState
        className="mx-5 mb-5"
        icon={<ReceiptText className="size-4" />}
        title="No payments yet"
        description="Only payments with a valid signer proof land here."
      />
    );
  return (
    <ul className="divide-y border-t">
      {payments.map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
          <span className="grid size-7 flex-none place-items-center rounded-md bg-armed-soft text-armed">
            <ArrowUpRight className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-xs">{p.account}</div>
            <div className="truncate text-xs text-muted-foreground">
              {p.detail ?? "Payment"} · {ago(p.at)}
            </div>
          </div>
          <span className="text-sm font-medium tabular-nums">{fmtNear(p.amount ?? 0)} NEAR</span>
        </li>
      ))}
    </ul>
  );
}

function KeysList({ snap }: { snap: VaultSnapshot }) {
  const keys = snap.accessKeys.filter((k) => k.permission !== "FullAccess");
  if (keys.length === 0)
    return (
      <EmptyState
        className="mx-5 mb-5"
        icon={<KeyRound className="size-4" />}
        title="No agent keys"
        description="The last trip deleted them. A stolen copy can't sign anything."
        action={
          <Button size="sm" variant="outline" asChild>
            <Link href="/lab">Re-arm with fresh keys</Link>
          </Button>
        }
      />
    );
  return (
    <ul className="divide-y border-t">
      {keys.map((k) => (
        <li key={k.public_key} className="flex items-center gap-3 px-5 py-2.5">
          <KeyRound className="size-4 flex-none text-muted-foreground" />
          <span className="truncate font-mono text-xs">{shortKey(k.public_key)}</span>
          <CopyButton value={k.public_key} />
          <Badge
            variant="secondary"
            className="ml-auto rounded-md font-mono text-[10px] font-normal"
          >
            pay only
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function Notices() {
  const { snap, error } = useVault();
  return (
    <>
      {snap?.mode === "simulation" && (
        <div
          data-testid="sim-banner"
          className="mb-6 flex items-start gap-3 rounded-lg border bg-card px-3.5 py-2.5 text-sm shadow-xs sm:items-center"
        >
          <span className="flex-none rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">
            Simulation
          </span>
          <span className="text-muted-foreground">
            In-memory vault with the contract&apos;s rules and real ed25519 proofs. Add testnet
            credentials to use the deployed contract.
          </span>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-tripped/25 bg-tripped-soft px-3.5 py-2.5 text-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 flex-none text-tripped" />
          <span>
            <span className="font-medium">Can&apos;t reach the vault.</span>{" "}
            <span className="text-muted-foreground">{error}</span>
          </span>
        </div>
      )}
    </>
  );
}

export default function Overview() {
  const { snap } = useVault();
  const explorer = snap ? accountLink(snap.explorerUrl, snap.vaultId) : null;

  return (
    <>
      <PageHeader
        title="Overview"
        description={
          snap
            ? `Live state of ${snap.vaultId}, read from the contract every few seconds.`
            : "Live state of the agent's vault."
        }
        actions={
          <>
            {explorer && snap?.mode === "live" && (
              <Button variant="outline" asChild className="bg-card">
                <a href={explorer} target="_blank" rel="noreferrer">
                  NearBlocks <ArrowUpRight className="size-4" />
                </a>
              </Button>
            )}
            <Button asChild>
              <Link href="/lab">
                <FlaskConical className="size-4" /> Run an attack
              </Link>
            </Button>
          </>
        }
      />
      <Notices />
      {!snap ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[108px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          {snap.status.frozen && <TrippedBanner snap={snap} />}
          <div data-testid="status-plate" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi
              label="Status"
              icon={snap.status.frozen ? ShieldAlert : ShieldCheck}
              footer={
                <>
                  Epoch {snap.status.epoch} ·{" "}
                  <span data-testid="key-count">
                    {snap.accessKeys.filter((k) => k.permission !== "FullAccess").length}
                  </span>{" "}
                  agent keys
                </>
              }
            >
              <span className="flex items-center gap-2.5">
                <Lamp state={snap.status.frozen ? "tripped" : "armed"} ping className="size-2" />
                <span data-testid="state-word" className={cn(snap.status.frozen && "text-tripped")}>
                  {snap.status.frozen ? "Tripped" : "Armed"}
                </span>
              </span>
            </Kpi>
            <Kpi
              label="Available"
              icon={Wallet}
              footer={`Max ${near(snap.config.policy.per_payment_cap)} NEAR per payment`}
            >
              {near(snap.status.available)}{" "}
              <span className="text-sm font-normal text-muted-foreground">NEAR</span>
            </Kpi>
            <Kpi
              label="Spent today"
              icon={Landmark}
              footer={
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-[width] duration-700"
                    style={{
                      width: `${pct(snap.status.spent_in_window, snap.config.policy.daily_cap)}%`,
                    }}
                  />
                </div>
              }
            >
              {near(snap.status.spent_in_window)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / {near(snap.config.policy.daily_cap)} NEAR
              </span>
            </Kpi>
            <Kpi
              label="Attacks stopped"
              icon={ShieldAlert}
              footer={snap.trips[0] ? `Last one ${ago(snap.trips[0].at)}` : "No attempts yet"}
            >
              {snap.trips.length}
            </Kpi>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel
              title="Activity"
              description="NEAR paid by agents. Red markers are trips."
              className="lg:col-span-2"
              action={<ViewAll href="/activity" />}
            >
              <div className="px-3 pb-3">
                <ActivityChart snap={snap} />
              </div>
            </Panel>
            <Panel
              title="Recent alerts"
              description="Each one froze the vault."
              testId="trips"
              action={<ViewAll href="/activity" />}
            >
              <AlertsFeed snap={snap} />
            </Panel>
          </div>

          <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <Panel
              title="Recent payments"
              description="Every one carried a valid signer proof."
              action={<ViewAll href="/activity" />}
            >
              <RecentPayments snap={snap} />
            </Panel>
            <Panel
              title="Agent keys"
              description="Function-call keys that may only call pay."
              testId="keys"
              action={<ViewAll href="/keys" label="Manage" />}
            >
              <KeysList snap={snap} />
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
