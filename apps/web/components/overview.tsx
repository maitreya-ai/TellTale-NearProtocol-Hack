"use client";

import {
  ArrowRight,
  Ban,
  CircleCheck,
  FlaskConical,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { VaultSnapshot } from "@/lib/types";
import { PageHeader } from "./app-shell";
import { Lamp } from "./brand";
import { ago, CAUSE_LABEL, near, pct, shortKey } from "./format";
import { useVault } from "./vault-provider";

function StatusHero({ snap }: { snap: VaultSnapshot | null }) {
  const tripped = snap?.status.frozen ?? false;
  const lastTrip = snap?.trips[0];
  return (
    <Card
      data-testid="status-plate"
      className={cn(
        "relative overflow-hidden",
        tripped ? "border-tripped/40" : snap ? "border-armed/30" : "",
      )}
    >
      <div
        className={cn(
          "hero-grid pointer-events-none absolute inset-0",
          tripped ? "bg-tripped-soft/60" : "bg-armed-soft/40",
        )}
        aria-hidden="true"
      />
      <CardContent className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <Lamp
          state={snap ? (tripped ? "tripped" : "armed") : "idle"}
          className="size-10 sm:size-14"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Vault state
            </span>
            {snap && (
              <Badge variant="outline" className="bg-card font-mono">
                epoch {snap.status.epoch}
              </Badge>
            )}
          </div>
          <div
            data-testid="state-word"
            className={cn(
              "text-4xl font-semibold tracking-tight sm:text-5xl",
              tripped ? "text-tripped" : "text-armed",
              !snap && "text-muted-foreground",
            )}
          >
            {snap ? (tripped ? "TRIPPED" : "ARMED") : "…"}
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            {tripped && lastTrip
              ? `${CAUSE_LABEL[lastTrip.cause] ?? lastTrip.cause}. Payments are frozen and ${lastTrip.keysDeleted} agent keys were deleted ${ago(lastTrip.at)}. The owner re-arms with fresh keys.`
              : "Every agent key is a tripwire. A payment without a signer proof, or a call to a decoy tool, freezes the vault and deletes every agent key."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col">
          <Button asChild>
            <Link href="/lab">
              <FlaskConical className="size-4" />
              {tripped ? "Re-arm in the lab" : "Run an attack"}
            </Link>
          </Button>
          <Button variant="outline" asChild className="bg-card">
            <Link href="/how-it-works">
              How it works <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  progress,
  tone,
  testId,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint: string;
  progress?: number;
  tone?: "armed" | "tripped" | "warn";
  testId?: string;
}) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-5">
        <CardDescription className="text-xs font-medium">{label}</CardDescription>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2 px-5">
        <div
          data-testid={testId}
          className={cn(
            "font-mono text-2xl font-medium tabular-nums",
            tone === "tripped" && "text-tripped",
            tone === "armed" && "text-armed",
          )}
        >
          {value}
        </div>
        {progress !== undefined && (
          <Progress
            value={progress}
            className={cn("h-1.5", progress >= 100 && "[&>div]:bg-tripped")}
          />
        )}
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Stats({ snap }: { snap: VaultSnapshot }) {
  const agentKeys = snap.accessKeys.filter((k) => k.permission !== "FullAccess").length;
  const { status, config } = snap;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        icon={KeyRound}
        label="Live agent keys"
        value={agentKeys}
        tone={agentKeys ? "armed" : "tripped"}
        hint={agentKeys ? "Each may only call pay on the vault" : "Deleted by the last trip"}
        testId="key-count"
      />
      <Stat
        icon={Wallet}
        label="Available"
        value={
          <>
            {near(status.available)}
            <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">NEAR</span>
          </>
        }
        hint={`Per-payment cap ${near(config.policy.per_payment_cap)} NEAR`}
      />
      <Stat
        icon={ShieldCheck}
        label="Spent today"
        value={`${near(status.spent_in_window)} / ${near(config.policy.daily_cap)}`}
        progress={pct(status.spent_in_window, config.policy.daily_cap)}
        hint="Rolling 24-hour window, NEAR"
      />
      <Stat
        icon={Ban}
        label="Strikes"
        value={`${status.strikes} / ${config.policy.max_strikes}`}
        progress={
          config.policy.max_strikes ? (status.strikes / config.policy.max_strikes) * 100 : 0
        }
        hint="Denied payments before an automatic trip"
      />
    </div>
  );
}

function KeysCard({ snap }: { snap: VaultSnapshot }) {
  const agentKeys = snap.accessKeys.filter((k) => k.permission !== "FullAccess");
  const fullKeys = snap.accessKeys.filter((k) => k.permission === "FullAccess");
  const lastTrip = snap.trips[0];
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-base">Keys on the vault account</CardTitle>
        <CardDescription>
          Read live from the chain. Copies of some agent keys are planted as bait.
        </CardDescription>
      </CardHeader>
      <CardContent data-testid="keys">
        {agentKeys.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-tripped/40 bg-tripped-soft p-4 text-sm">
            <Siren className="mt-0.5 size-4 text-tripped" />
            <div>
              <div className="font-medium">No agent keys on the vault</div>
              <div className="text-muted-foreground">
                {lastTrip
                  ? `Trip #${lastTrip.index + 1} deleted ${lastTrip.keysDeleted} keys. `
                  : ""}
                A stolen key can no longer sign anything.
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Public key</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead className="text-right">Nonce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentKeys.map((k) => (
                  <TableRow key={k.public_key}>
                    <TableCell className="font-mono text-xs">
                      <Tooltip>
                        <TooltipTrigger className="cursor-default">
                          {shortKey(k.public_key)}
                        </TooltipTrigger>
                        <TooltipContent className="font-mono">{k.public_key}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        pay only
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {k.nonce.length > 8 ? `…${k.nonce.slice(-6)}` : k.nonce}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {fullKeys.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Plus {fullKeys.length} deployer full-access key (testnet only, removed by{" "}
            <code className="font-mono">lock-vault</code>).
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TripsCard({ snap }: { snap: VaultSnapshot }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Trip log</CardTitle>
        <CardDescription>Every time the alarm went off.</CardDescription>
      </CardHeader>
      <CardContent data-testid="trips" className="max-h-80 space-y-4 overflow-y-auto">
        {snap.trips.length === 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <CircleCheck className="size-4 text-armed" />
            No trips yet. Run an attack in the lab.
          </div>
        )}
        {snap.trips.map((t) => (
          <div key={`${t.index}-${t.at}`} className="relative border-l-2 border-tripped/60 pl-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-3.5 text-tripped" />
              <span className="text-sm font-medium">
                #{t.index + 1} · {CAUSE_LABEL[t.cause] ?? t.cause}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs break-all text-muted-foreground">{t.detail}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.keysDeleted} keys deleted · epoch {t.epoch} · {ago(t.at)}
              {t.blockHeight ? ` · block ${t.blockHeight}` : ""}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PaymentsCard({ snap }: { snap: VaultSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payments</CardTitle>
        <CardDescription>Only payments with a valid signer proof reach this list.</CardDescription>
      </CardHeader>
      <CardContent>
        {snap.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Memo</TableHead>
                  <TableHead>Epoch</TableHead>
                  <TableHead className="text-right">NEAR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.payments.slice(0, 12).map((p) => (
                  <TableRow key={p.index}>
                    <TableCell className="font-mono text-xs">{p.index + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{p.receiverId}</TableCell>
                    <TableCell className="text-xs">{p.memo ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.epoch}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {near(p.amount, 4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Notices() {
  const { snap, error } = useVault();
  return (
    <>
      {snap?.mode === "simulation" && (
        <Alert data-testid="sim-banner" className="mb-6 border-brand/40 bg-brand-soft">
          <FlaskConical className="size-4" />
          <AlertTitle>Simulation mode</AlertTitle>
          <AlertDescription>
            The vault runs in memory with the contract&apos;s rules and real ed25519 proofs. Set
            TELLTALE_MOCK=0 and the testnet variables to use the deployed contract.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-6" role="alert">
          <Siren className="size-4" />
          <AlertTitle>Can&apos;t reach the vault</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
        description="Live state of the AI agent's vault. Keys, trips and payments come straight from the contract."
      />
      <Notices />
      <div className="flex flex-col gap-6">
        <StatusHero snap={snap} />
        {snap ? (
          <>
            <Stats snap={snap} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <KeysCard snap={snap} />
              <TripsCard snap={snap} />
            </div>
            <PaymentsCard snap={snap} />
          </>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
