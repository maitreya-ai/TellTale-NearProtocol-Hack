"use client";

import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { near, shortKey } from "../format";
import { CopyButton, PageHeader } from "../kit";
import { Notices } from "../overview";
import { useVault } from "../vault-provider";

function Setting({
  title,
  description,
  method,
  children,
}: {
  title: string;
  description: string;
  method: string;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-8">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
      <div className="flex items-center gap-2 border-t bg-muted/40 px-5 py-2.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" />
        Owner only · <code className="font-mono">{method}</code> with 1 yoctoNEAR attached
      </div>
    </Card>
  );
}

function Field({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="mt-1.5 flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm tabular-nums">
        {value}
        {unit && <span className="ml-auto text-muted-foreground">{unit}</span>}
      </span>
    </label>
  );
}

function AccountList({ accounts, empty }: { accounts: string[]; empty: string }) {
  if (!accounts.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y rounded-md border">
      {accounts.map((a) => (
        <li key={a} className="flex items-center gap-2 px-3 py-2">
          <span className="truncate font-mono text-xs">{a}</span>
          <CopyButton value={a} className="ml-auto" />
        </li>
      ))}
    </ul>
  );
}

export default function PolicyPage() {
  const { snap } = useVault();
  return (
    <>
      <PageHeader
        title="Policy"
        description="Rules the contract checks on every pay call. Only the owner's full-access key can change them."
      />
      <Notices />
      {!snap ? (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <Setting
            title="Spending limits"
            description="Caps still apply to payments with a valid proof, so a leaked signer can't drain the vault."
            method="set_policy"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Per payment"
                value={near(snap.config.policy.per_payment_cap)}
                unit="NEAR"
              />
              <Field
                label="Rolling 24 hours"
                value={near(snap.config.policy.daily_cap)}
                unit="NEAR"
              />
            </div>
          </Setting>
          <Setting
            title="Allowlist"
            description="Receivers the agent may pay. Anything else is denied and counts as a strike."
            method="set_policy"
          >
            <AccountList
              accounts={snap.config.policy.allowlist ?? []}
              empty="Any account (no allowlist)."
            />
          </Setting>
          <Setting
            title="Automatic trip"
            description="Too many denied payments in one window trips the vault, even with valid proofs."
            method="set_policy"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Trip after"
                value={String(snap.config.policy.max_strikes)}
                unit="denied payments"
              />
              <Field label="Strikes now" value={String(snap.status.strikes)} />
            </div>
          </Setting>
          <Setting
            title="Signer"
            description="Every payment needs an ed25519 proof from this key, bound to the agent key that signed it."
            method="set_signer"
          >
            <div className="flex items-center gap-1 rounded-md border bg-muted/30 px-3 py-2">
              <span className="truncate font-mono text-xs">{shortKey(snap.config.signer_pk)}</span>
              <CopyButton value={snap.config.signer_pk} className="ml-auto" />
            </div>
          </Setting>
          <Setting
            title="Reporters"
            description="Accounts allowed to trip the vault when an agent touches a decoy tool or credential."
            method="add_reporter"
          >
            <AccountList accounts={snap.config.reporters} empty="No reporters registered." />
          </Setting>
          <Setting
            title="Owner"
            description="Re-arms the vault, withdraws funds (even while frozen) and changes this policy."
            method="rearm · withdraw"
          >
            <AccountList accounts={[snap.config.owner_id]} empty="" />
          </Setting>
        </div>
      )}
    </>
  );
}
