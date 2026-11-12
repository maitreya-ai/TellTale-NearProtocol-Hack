"use client";

import {
  ArrowUpRight,
  CircleCheck,
  FlaskConical,
  KeyRound,
  Landmark,
  ReceiptText,
  RotateCcw,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { VaultSnapshot } from "@/lib/types";
import { StatusBadge } from "./brand";
import { accountLink, ago, CAUSE_LABEL, near, pct, shortKey } from "./format";
import { CopyButton, EmptyState, PageHeader, SectionTitle, Stat, StatGroup } from "./kit";
import { useVault } from "./vault-provider";

function TrippedBanner({ snap }: { snap: VaultSnapshot }) {
  const trip = snap.trips[0];
  return (
    <div className="flex flex-col gap-3 border-b border-tripped/20 bg-tripped-soft px-5 py-3 sm:flex-row sm:items-center">
      <ShieldAlert className="hidden size-4 flex-none text-tripped sm:block" />
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-medium text-tripped">Tripped{trip ? ` ${ago(trip.at)}` : ""}.</span>{" "}
        <span className="text-foreground/80">
          {trip ? `${CAUSE_LABEL[trip.cause] ?? trip.cause}. ` : ""}
          Payments are frozen and {trip ? trip.keysDeleted : "all"} agent keys were deleted.
        </span>
      </div>
      <Button size="sm" asChild>
        <Link href="/lab">
          <RotateCcw className="size-3.5" /> Re-arm in the lab
        </Link>
      </Button>
    </div>
  );
}

function VaultCard({ snap }: { snap: VaultSnapshot }) {
  const { status, config } = snap;
  const tripped = status.frozen;
  const agentKeys = snap.accessKeys.filter((k) => k.permission !== "FullAccess").length;
  const explorer = accountLink(snap.explorerUrl, snap.vaultId);
  const strikesPct = config.policy.max_strikes
    ? (status.strikes / config.policy.max_strikes) * 100
    : 0;

  return (
    <Card data-testid="status-plate" className="gap-0 overflow-hidden py-0">
      {tripped && <TrippedBanner snap={snap} />}
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
        <span className="grid size-10 flex-none place-items-center rounded-lg border bg-muted/60">
          <Landmark className="size-[18px] text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate font-mono text-sm font-medium">{snap.vaultId}</span>
            <CopyButton value={snap.vaultId} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge state={tripped ? "tripped" : "armed"} testId="state-word" />
            <Badge variant="outline" className="h-6 rounded-md font-mono font-normal">
              {snap.mode === "live" ? snap.network : "simulation"}
            </Badge>
            <Badge variant="outline" className="h-6 rounded-md font-mono font-normal">
              epoch {status.epoch}
            </Badge>
            <span className="hidden sm:inline">
              Owner <span className="font-mono text-foreground">{config.owner_id}</span>
            </span>
          </div>
        </div>
        {explorer && snap.mode === "live" && (
          <Button variant="outline" size="sm" asChild>
            <a href={explorer} target="_blank" rel="noreferrer">
              View on NearBlocks <ArrowUpRight className="size-3.5" />
            </a>
          </Button>
        )}
      </div>
      <StatGroup className="border-t">
        <Stat
          label="Agent keys"
          value={agentKeys}
          tone={agentKeys ? undefined : "tripped"}
          hint={agentKeys ? "Pay-only function-call keys" : "Deleted by the last trip"}
          testId="key-count"
        />
        <Stat
          label="Available"
          value={near(status.available)}
          unit="NEAR"
          hint={`Cap ${near(config.policy.per_payment_cap)} NEAR per payment`}
        />
        <Stat
          label="Spent today"
          value={near(status.spent_in_window)}
          unit={`/ ${near(config.policy.daily_cap)} NEAR`}
          progress={pct(status.spent_in_window, config.policy.daily_cap)}
        />
        <Stat
          label="Strikes"
          value={status.strikes}
          unit={`/ ${config.policy.max_strikes}`}
          progress={strikesPct}
        />
      </StatGroup>
    </Card>
  );
}

function KeysTable({ snap }: { snap: VaultSnapshot }) {
  const agentKeys = snap.accessKeys.filter((k) => k.permission !== "FullAccess");
  const fullKeys = snap.accessKeys.filter((k) => k.permission === "FullAccess");
  const trip = snap.trips[0];
  if (agentKeys.length === 0)
    return (
      <EmptyState
        className="m-4"
        icon={<KeyRound className="size-4" />}
        title="No agent keys on the vault"
        description={`${trip ? `Trip #${trip.index + 1} deleted ${trip.keysDeleted} keys. ` : ""}A stolen key can no longer sign anything.`}
        action={
          <Button size="sm" variant="outline" asChild>
            <Link href="/lab">Re-arm with fresh keys</Link>
          </Button>
        }
      />
    );
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Public key</TableHead>
            <TableHead>Permission</TableHead>
            <TableHead className="pr-5 text-right">Nonce</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agentKeys.map((k) => (
            <TableRow key={k.public_key}>
              <TableCell className="pl-5">
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger className="cursor-default font-mono text-xs">
                      {shortKey(k.public_key)}
                    </TooltipTrigger>
                    <TooltipContent className="font-mono">{k.public_key}</TooltipContent>
                  </Tooltip>
                  <CopyButton value={k.public_key} />
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="rounded-md font-mono text-[11px] font-normal">
                  pay only
                </Badge>
              </TableCell>
              <TableCell className="pr-5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                {k.nonce.length > 8 ? `…${k.nonce.slice(-6)}` : k.nonce}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t px-5 py-3 text-xs text-muted-foreground">
        Copies of some of these keys sit in bait files.
        {fullKeys.length > 0 &&
          ` Plus ${fullKeys.length} deployer full-access key (testnet only, removed by lock-vault).`}
      </p>
    </>
  );
}

function PaymentsTable({ snap }: { snap: VaultSnapshot }) {
  if (snap.payments.length === 0)
    return (
      <EmptyState
        className="m-4"
        icon={<ReceiptText className="size-4" />}
        title="No payments yet"
        description="Only payments with a valid signer proof land here. Run the honest scenario to make some."
      />
    );
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5">To</TableHead>
          <TableHead>Memo</TableHead>
          <TableHead>Epoch</TableHead>
          <TableHead className="pr-5 text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {snap.payments.slice(0, 12).map((p) => (
          <TableRow key={p.index}>
            <TableCell className="pl-5 font-mono text-xs">{p.receiverId}</TableCell>
            <TableCell className="max-w-48 truncate text-xs text-muted-foreground">
              {p.memo ?? "—"}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{p.epoch}</TableCell>
            <TableCell className="pr-5 text-right font-mono text-xs tabular-nums">
              {near(p.amount, 4)} NEAR
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TripLog({ snap }: { snap: VaultSnapshot }) {
  return (
    <Card className="gap-0 py-0">
      <div className="border-b px-5 py-3.5">
        <SectionTitle title="Trip log" description="Every time the alarm went off." />
      </div>
      <div data-testid="trips" className="max-h-[22rem] overflow-y-auto px-5 py-4">
        {snap.trips.length === 0 ? (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <CircleCheck className="size-4 text-armed" />
            No trips yet.
          </div>
        ) : (
          <ol className="relative space-y-5 border-l pl-5">
            {snap.trips.map((t) => (
              <li key={`${t.index}-${t.at}`} className="relative">
                <span className="absolute top-1 -left-[25px] grid size-[9px] place-items-center rounded-full bg-tripped ring-4 ring-card" />
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{CAUSE_LABEL[t.cause] ?? t.cause}</span>
                  <span className="flex-none text-xs text-muted-foreground">{ago(t.at)}</span>
                </div>
                <p className="mt-1 line-clamp-2 font-mono text-[11px] break-all text-muted-foreground">
                  {t.detail}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  #{t.index + 1} · {t.keysDeleted} keys deleted · epoch {t.epoch}
                  {t.blockHeight ? ` · block ${t.blockHeight}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}

function PolicyCard({ snap }: { snap: VaultSnapshot }) {
  const { policy, signer_pk, reporters } = snap.config;
  const rows: [string, React.ReactNode][] = [
    ["Per payment", `${near(policy.per_payment_cap)} NEAR`],
    ["Daily cap", `${near(policy.daily_cap)} NEAR`],
    ["Auto-trip after", `${policy.max_strikes} denied payments`],
    [
      "Allowlist",
      policy.allowlist?.length ? (
        <span className="flex flex-col items-end gap-0.5">
          {policy.allowlist.map((a) => (
            <span key={a} className="font-mono text-[11px]">
              {a}
            </span>
          ))}
        </span>
      ) : (
        "Any account"
      ),
    ],
    ["Signer key", <span className="font-mono text-[11px]">{shortKey(signer_pk)}</span>],
    ["Reporters", reporters.length || "None"],
  ];
  return (
    <Card className="gap-0 py-0">
      <div className="border-b px-5 py-3.5">
        <SectionTitle title="Policy" description="Enforced by the contract on every pay call." />
      </div>
      <dl className="divide-y px-5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 py-2.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="min-w-0 text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
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
  return (
    <>
      <PageHeader
        title="Overview"
        description="Live state of the agent's vault, read from the contract every few seconds."
        actions={
          <>
            <Button variant="outline" asChild className="bg-card">
              <Link href="/how-it-works">How it works</Link>
            </Button>
            <Button asChild>
              <Link href="/lab">
                <FlaskConical className="size-4" /> Run an attack
              </Link>
            </Button>
          </>
        }
      />
      <Notices />
      {snap ? (
        <div className="space-y-6">
          <VaultCard snap={snap} />
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="min-w-0 gap-0 py-0">
              <Tabs defaultValue="keys" className="gap-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
                  <TabsList>
                    <TabsTrigger value="keys">
                      Keys
                      <span className="rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground tabular-nums group-data-[state=active]:bg-secondary">
                        {snap.accessKeys.filter((k) => k.permission !== "FullAccess").length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="payments">
                      Payments
                      <span className="rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground tabular-nums">
                        {snap.payments.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                  <span className="text-xs text-muted-foreground">Read live from the chain</span>
                </div>
                <TabsContent value="keys" data-testid="keys" className="overflow-x-auto">
                  <KeysTable snap={snap} />
                </TabsContent>
                <TabsContent value="payments" className="overflow-x-auto">
                  <PaymentsTable snap={snap} />
                </TabsContent>
              </Tabs>
            </Card>
            <div className="space-y-6">
              <TripLog snap={snap} />
              <PolicyCard snap={snap} />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Skeleton className="h-[184px] rounded-xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      )}
    </>
  );
}
