import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Bomb,
  Fingerprint,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton, PageHeader, SectionTitle } from "@/components/kit";
import { REPO_URL } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "How it works" };

const STEPS = [
  {
    icon: Fingerprint,
    title: "The agent asks, the signer proves",
    body: "The agent never holds key material. It sends a payment intent to the Telltale signer, which signs the transaction with an agent key and attaches an ed25519 proof bound to that key, the receiver, the amount and a nonce.",
  },
  {
    icon: KeyRound,
    title: "Any key used elsewhere trips the vault",
    body: "Agent keys are function-call keys that may only call pay on the vault. A call without a valid proof means the key was used outside the signer, so the contract freezes in the same call and deletes every agent key a block later.",
  },
  {
    icon: Bomb,
    title: "Decoy tools catch hijacked agents",
    body: "The agent sees tools no honest task needs, like raise_spending_limit. An injected or jailbroken agent reaches for them, and the call trips the vault through the reporter before any money moves.",
  },
  {
    icon: RotateCcw,
    title: "The owner re-arms",
    body: "Deposits and owner withdrawals keep working while frozen. One owner transaction installs a fresh set of keys and moves the vault to the next epoch.",
  },
];

const WHY_NEAR = [
  "One account holds many keys, and a contract reads which one signed with env::signer_account_pk(). An Ethereum account has one key and a contract only sees the address.",
  "Function-call keys can't transfer NEAR or attach deposits, so a stolen key can only call the vault, and the vault decides.",
  "A contract can delete keys on its own account, so the alarm removes the keys without waiting for the owner.",
  "env::ed25519_verify makes checking a proof on every payment cheap.",
  "Owner methods require 1 yoctoNEAR, which forces a full-access key. A leaked dApp login key can't re-arm or drain the vault.",
];

const METHODS = [
  [
    "pay(receiver_id, amount, memo?, nonce?, proof?)",
    "agent keys",
    "Valid proof and policy: transfer. Missing or bad proof: trip. Policy fail: denied and a strike.",
  ],
  [
    "report(kind, detail)",
    "reporters, owner",
    "Trip for a decoy tool, a decoy credential or a manual freeze.",
  ],
  [
    "rearm(public_keys)",
    "owner · 1 yocto",
    "Unfreeze, delete leftover keys, add fresh keys, next epoch.",
  ],
  ["withdraw(amount)", "owner · 1 yocto", "Evacuate funds, even while frozen."],
  [
    "get_status / get_trips / get_payments",
    "anyone",
    "Views the dashboard reads every few seconds.",
  ],
];

const PROOF = `telltale-pay-v1
vault:<vault account id>
key:<signer_account_pk, "ed25519:…">
to:<receiver account id>
amount:<yoctoNEAR>
nonce:<u64, strictly increasing>
memo:<sha256 hex of the memo>`;

export default function HowItWorks() {
  return (
    <>
      <PageHeader
        title="How it works"
        description="Every key an AI agent holds is a tripwire. Nothing on-chain says which keys are bait, so reading the contract tells an attacker nothing."
        actions={
          <>
            <Button variant="outline" asChild className="bg-card">
              <a
                href={`${REPO_URL}/blob/main/docs/architecture.md`}
                target="_blank"
                rel="noreferrer"
              >
                Architecture doc <ArrowUpRight className="size-4" />
              </a>
            </Button>
            <Button asChild data-testid="hiw-open-lab">
              <Link href="/lab">
                Open the attack lab <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        }
      />

      <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border shadow-xs md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="flex flex-col gap-3 bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-8 place-items-center rounded-md border bg-muted/60">
                  <Icon className="size-4 text-muted-foreground" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h2 className="text-sm font-semibold">{step.title}</h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b px-5 py-3.5">
            <SectionTitle
              title="The proof"
              description="The exact bytes the signer signs. Rust and TypeScript build them from shared test vectors."
            />
          </div>
          <div className="relative border-b bg-muted/30">
            <div className="flex items-center justify-between border-b px-4 py-1.5">
              <span className="font-mono text-[11px] text-muted-foreground">proof message</span>
              <CopyButton value={PROOF} />
            </div>
            <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed">
              {PROOF}
            </pre>
          </div>
          <ul className="space-y-2 px-5 py-4 text-sm text-muted-foreground">
            <li>
              A proof seen in an old transaction can&apos;t be replayed with a stolen key: the key
              line won&apos;t match.
            </li>
            <li>
              A stale nonce with a valid signature is a plain denial, not a trip, since it can
              happen in a real race.
            </li>
          </ul>
        </Card>

        <Card className="gap-0 py-0">
          <div className="border-b px-5 py-3.5">
            <SectionTitle
              title="Why this only works on NEAR"
              description="Each piece is a protocol feature, not a convention."
            />
          </div>
          <ul className="divide-y">
            {WHY_NEAR.map((line) => (
              <li key={line} className="flex gap-3 px-5 py-3 text-sm">
                <Check className="mt-0.5 size-4 flex-none text-armed" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <SectionTitle
        className="mt-10 mb-3"
        title="Contract interface"
        description="telltale-vault, Rust, near-sdk 5.30."
      />
      <Card className="gap-0 overflow-x-auto py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Method</TableHead>
              <TableHead>Caller</TableHead>
              <TableHead className="pr-5">Does</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {METHODS.map(([method, caller, does]) => (
              <TableRow key={method}>
                <TableCell className="pl-5 font-mono text-xs whitespace-nowrap">{method}</TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {caller}
                </TableCell>
                <TableCell className="min-w-64 pr-5 text-sm whitespace-normal">{does}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <SectionTitle
        className="mt-10 mb-3"
        title="What it doesn't stop"
        description="Known limits, stated plainly."
      />
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border text-sm text-muted-foreground shadow-xs md:grid-cols-3">
        <p className="bg-card p-5">
          If the signer and its proof secret leak together, a thief can pay inside the caps.
          That&apos;s why the caps stay, and why the signer moves into an OutLayer TEE next.
        </p>
        <p className="bg-card p-5">
          A thief who steals keys but never uses them trips nothing. Every canary system shares this
          limit.
        </p>
        <p className="bg-card p-5">
          On testnet the vault keeps its deployer key for upgrades.{" "}
          <code className="font-mono text-xs text-foreground">lock-vault</code> removes it for real
          use.
        </p>
      </div>
    </>
  );
}
