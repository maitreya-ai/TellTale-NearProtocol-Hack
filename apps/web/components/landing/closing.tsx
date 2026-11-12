"use client";

import { ArrowRight, Eye, KeyRound, Trash2 } from "lucide-react";
import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/brand";
import { GitHubMark } from "@/components/icons";
import { CopyButton } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { REPO_URL } from "@/lib/site";
import { Corners, Reveal, Section, SectionHeader } from "./motion";

const STATS = [
  { value: "Same tx", label: "the vault freezes" },
  { value: "1 block", label: "until every key is deleted" },
  { value: "0", label: "decoys listed on-chain" },
  { value: "0", label: "humans in the loop" },
];

export function Stats() {
  return (
    <Section label="At a glance">
      <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.06} className="bg-background px-5 py-7 sm:px-8">
            <div className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
              {s.value}
            </div>
            <div className="mt-1.5 text-sm text-muted-foreground">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const FEATURES = [
  {
    icon: Eye,
    code: "env::signer_account_pk()",
    title: "Many keys, one account",
    body: "A NEAR account holds many keys, and the contract sees exactly which one signed.",
  },
  {
    icon: KeyRound,
    code: "FunctionCall { method: pay }",
    title: "Keys that can't spend",
    body: "Function-call keys can't transfer NEAR. A stolen key can only ask the vault.",
  },
  {
    icon: Trash2,
    code: "Promise::delete_key(pk)",
    title: "Contracts that delete keys",
    body: "The vault removes keys on its own account. The alarm doesn't wait for the owner.",
  },
];

export function WhyNear() {
  return (
    <Section id="near" label="Why NEAR">
      <SectionHeader
        eyebrow="Why NEAR"
        title="Built on protocol features, not conventions."
        description="On a one-key-per-account chain a contract only sees an address. On NEAR it sees the key."
      />
      <div className="grid grid-cols-1 gap-px border-t bg-border md:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <Reveal
              key={f.title}
              delay={i * 0.06}
              className="flex flex-col bg-background p-5 sm:p-8"
            >
              <span className="grid size-9 place-items-center rounded-md border bg-card shadow-xs">
                <Icon className="size-4" />
              </span>
              <h3 className="mt-5 text-base font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              <code className="mt-5 w-fit rounded-md border bg-card px-2 py-1 font-mono text-xs">
                {f.code}
              </code>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

const COMMAND = "bun run attack:drain";

export function Cta() {
  return (
    <Section label="Try it" className="isolate">
      <div
        aria-hidden="true"
        className="bg-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_60%_80%_at_70%_50%,#000,transparent)]"
      />
      <div className="relative grid items-center gap-8 px-5 py-14 sm:px-8 md:grid-cols-[1fr_auto] md:py-16">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Steal a key. Watch it trip.
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Run the attacks yourself against a live vault on NEAR testnet, or from the command line.
          </p>
          <div className="mt-5 flex w-fit items-center gap-2 rounded-md border bg-card py-1 pr-1 pl-3 font-mono text-xs shadow-xs">
            <span className="text-muted-foreground">$</span>
            {COMMAND}
            <CopyButton value={COMMAND} />
          </div>
        </Reveal>
        <Reveal delay={0.1} className="flex flex-wrap gap-2.5">
          <Button asChild size="lg" className="group h-10 px-5" data-testid="cta-launch">
            <Link href="/how-it-works">
              Launch
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-10 bg-card px-5">
            <Link href="/lab">Open the attack lab</Link>
          </Button>
        </Reveal>
      </div>
    </Section>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t">
      <Corners />
      <div className="flex flex-col items-center justify-between gap-4 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:px-8">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-6" />
          <Wordmark className="text-foreground" />
          <span className="text-border">/</span>
          <span>Built at NEAR Hackathon 2026</span>
        </div>
        <nav aria-label="Footer" className="flex items-center gap-5">
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/lab" className="transition-colors hover:text-foreground">
            Attack lab
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <GitHubMark className="size-4" />
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
