import {
  ArrowUpRight,
  BadgeCheck,
  Bomb,
  Fingerprint,
  KeyRound,
  RotateCcw,
  ShieldOff,
  Wrench,
} from "lucide-react";
import { PageHeader, REPO_URL } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        description="Telltale turns every key an AI agent holds into a tripwire. Nothing about which keys are bait is stored on-chain, so reading the contract tells an attacker nothing."
        actions={
          <Button variant="outline" asChild className="bg-card">
            <a href={`${REPO_URL}/blob/main/docs/architecture.md`} target="_blank" rel="noreferrer">
              Architecture doc <ArrowUpRight className="size-4" />
            </a>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Card key={step.title} className="gap-3">
              <CardHeader className="gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-foreground text-background">
                    <Icon className="size-4" />
                  </span>
                  <Badge variant="outline" className="font-mono">
                    step {i + 1}
                  </Badge>
                </div>
                <CardTitle className="text-base">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">The proof</CardTitle>
            <CardDescription>
              The exact bytes the signer signs. Rust and TypeScript build them the same way, checked
              by shared test vectors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg border bg-muted/60 p-4 font-mono text-xs leading-relaxed">
              {PROOF}
            </pre>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                A proof seen in an old transaction can&apos;t be replayed with a stolen key, because
                the key line won&apos;t match.
              </li>
              <li>
                A stale nonce with a valid signature is a plain denial, not a trip, since it can
                happen in a real race.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Why this only works on NEAR</CardTitle>
            <CardDescription>Each piece is a protocol feature, not a convention.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {WHY_NEAR.map((line) => (
                <li key={line} className="flex gap-3 text-sm">
                  <BadgeCheck className="mt-0.5 size-4 flex-none text-armed" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Contract interface</CardTitle>
          <CardDescription>telltale-vault, Rust, near-sdk 5.30.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead>Caller</TableHead>
                <TableHead>Does</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {METHODS.map(([method, caller, does]) => (
                <TableRow key={method}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{method}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {caller}
                  </TableCell>
                  <TableCell className="min-w-64 text-sm whitespace-normal">{does}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldOff className="size-4" /> What it doesn&apos;t stop
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <p>
            If the signer and its proof secret leak together, a thief can pay inside the caps.
            That&apos;s why the caps stay, and why the signer moves into an OutLayer TEE next.
          </p>
          <p>
            A thief who steals keys but never uses them trips nothing. Every canary system shares
            this limit.
          </p>
          <p className="flex gap-2">
            <Wrench className="mt-0.5 size-4 flex-none" />
            On testnet the vault keeps its deployer key for upgrades. lock-vault removes it for real
            use.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
