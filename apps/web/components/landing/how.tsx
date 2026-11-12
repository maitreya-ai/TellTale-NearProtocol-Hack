"use client";

import { ArrowRight, Check, KeyRound, ShieldAlert, X } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EASE, Reveal, Section, SectionHeader } from "./motion";

/** Children fade in one after another when the card scrolls into view. */
const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

function Screen({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-[188px] flex-col overflow-hidden rounded-lg border bg-card shadow-xs">
      <div className="flex h-8 flex-none items-center justify-between border-b bg-muted/40 px-3">
        <span className="font-mono text-[11px] text-muted-foreground">{title}</span>
        {aside}
      </div>
      <motion.div
        variants={list}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-15% 0px" }}
        className="flex flex-1 flex-col justify-center gap-1 px-3 py-2 font-mono text-[11.5px]"
      >
        {children}
      </motion.div>
    </div>
  );
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={item} className={cn("flex items-center gap-2 truncate", className)}>
      {children}
    </motion.div>
  );
}

function ProofVisual() {
  return (
    <Screen
      title="signer · proof message"
      aside={<span className="rounded border bg-card px-1.5 font-mono text-[10px]">ed25519</span>}
    >
      <Row className="text-muted-foreground">telltale-pay-v1</Row>
      <Row className="text-muted-foreground">vault:vault.telltale.testnet</Row>
      <Row className="-mx-3 border-l-2 border-amber-500 bg-amber-50 px-2.5 py-0.5 text-amber-900">
        key:ed25519:7HkQ…q2Fa
        <span className="ml-auto font-sans text-[10px] text-amber-700">bound to this key</span>
      </Row>
      <Row className="text-muted-foreground">to:acme-hosting.testnet · amount:0.20</Row>
      <Row className="text-muted-foreground">nonce:1042</Row>
      <Row className="mt-1 text-armed">
        <Check className="size-3" /> signature valid → payment sent
      </Row>
    </Screen>
  );
}

function StolenKeyVisual() {
  return (
    <Screen title="thief@laptop ~ %">
      <Row className="text-muted-foreground">$ near call vault pay --key 7HkQ…q2Fa</Row>
      <Row>
        <ArrowRight className="size-3 text-muted-foreground" />
        pay(thief.testnet, 6.00) · no proof
      </Row>
      <Row className="-mx-3 bg-tripped-soft px-3 py-1 font-medium text-tripped">
        <ShieldAlert className="size-3" /> TRIPPED: key used without a signer proof
      </Row>
      <Row className="text-muted-foreground">$ near call vault pay --key B3nx…9TcL</Row>
      <Row className="text-tripped">
        <X className="size-3" /> access key does not exist
      </Row>
    </Screen>
  );
}

function DecoyVisual() {
  const tools: [string, boolean][] = [
    ["pay_invoice", false],
    ["get_balance", false],
    ["raise_spending_limit", true],
    ["export_wallet_backup", true],
  ];
  return (
    <Screen title="agent · tools">
      {tools.map(([name, decoy]) => (
        <Row
          key={name}
          className={cn(
            "-mx-3 px-3 py-0.5",
            name === "raise_spending_limit" && "bg-tripped-soft text-tripped",
          )}
        >
          <span>{name}()</span>
          {decoy ? (
            <span className="ml-auto rounded bg-amber-100 px-1.5 font-sans text-[10px] text-amber-800">
              decoy
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 font-sans text-[10px] text-muted-foreground">
              <Check className="size-3 text-armed" /> real
            </span>
          )}
        </Row>
      ))}
      <Row className="mt-1.5 text-tripped">
        <ShieldAlert className="size-3" /> injected agent called a decoy → TRIPPED
      </Row>
    </Screen>
  );
}

function RearmVisual() {
  const before = ["7HkQ…q2Fa", "B3nx…9TcL", "Ex4r…mW1d"];
  const after = ["Q9ws…Lr3b", "Ht2m…x8Kc", "Mv6p…Ae0n"];
  return (
    <Screen
      title="vault · access keys"
      aside={<span className="font-mono text-[10px] text-muted-foreground">rearm() · 1 tx</span>}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="space-y-1">
          <Row className="font-sans text-[10px] text-muted-foreground">epoch 0</Row>
          {before.map((k) => (
            <Row key={k} className="text-muted-foreground line-through decoration-tripped/70">
              <KeyRound className="size-3 text-tripped" />
              {k}
            </Row>
          ))}
        </div>
        <motion.span variants={item}>
          <ArrowRight className="size-3.5 text-muted-foreground" />
        </motion.span>
        <div className="space-y-1">
          <Row className="font-sans text-[10px] text-muted-foreground">epoch 1</Row>
          {after.map((k) => (
            <Row key={k}>
              <span className="size-1.5 rounded-full bg-armed" />
              {k}
            </Row>
          ))}
        </div>
      </div>
    </Screen>
  );
}

const STEPS = [
  {
    visual: <ProofVisual />,
    title: "The signer proves every payment",
    body: "Agents never hold key material. A signer pays for them and attaches an ed25519 proof bound to the exact key, receiver, amount and nonce.",
  },
  {
    visual: <StolenKeyVisual />,
    title: "A stolen key trips the vault",
    body: "A key used anywhere else has no proof. The contract freezes in that same call, and the next stolen key no longer exists.",
  },
  {
    visual: <DecoyVisual />,
    title: "Decoy tools catch hijacked agents",
    body: "The agent sees tools no honest task needs. A prompt-injected agent reaches for one, and the vault trips before money moves.",
  },
  {
    visual: <RearmVisual />,
    title: "Every key deleted. One tx re-arms.",
    body: "The vault deletes its own agent keys a block later. Deposits and withdrawals keep working; the owner installs fresh keys in one transaction.",
  },
];

export function How() {
  return (
    <Section id="how" label="How it works">
      <SectionHeader
        eyebrow="How it works"
        title="Four steps. No human in the loop."
        description="Every key an agent holds is a tripwire. Nothing on-chain says which keys are bait, so reading the contract tells an attacker nothing."
      />
      <div className="grid grid-cols-1 gap-px border-t bg-border md:grid-cols-2">
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex flex-col gap-5 bg-background p-5 sm:p-8">
            {step.visual}
            <Reveal>
              <div className="font-mono text-xs text-muted-foreground">0{i + 1}</div>
              <h3 className="mt-1.5 text-base font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-foreground">
                {step.body}
              </p>
            </Reveal>
          </div>
        ))}
      </div>
    </Section>
  );
}
