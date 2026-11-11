"use client";

import { BookOpen, ExternalLink, LayoutDashboard, Menu, Swords } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Lamp, Logo } from "./brand";
import { accountLink, shortAccount } from "./format";
import { useVault } from "./vault-provider";

export const REPO_URL = "https://github.com/maitreya-ai/TellTale---NearProtocol---Hack";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/lab", label: "Attack lab", icon: Swords },
  { href: "/how-it-works", label: "How it works", icon: BookOpen },
] as const;

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function VaultPill() {
  const { snap } = useVault();
  const tripped = snap?.status.frozen ?? false;
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-2.5">
        <Lamp state={snap ? (tripped ? "tripped" : "armed") : "idle"} />
        <span className={cn("text-sm font-semibold", tripped ? "text-tripped" : "text-armed")}>
          {snap ? (tripped ? "Tripped" : "Armed") : "Connecting…"}
        </span>
        {snap && (
          <Badge variant="outline" className="ml-auto font-mono text-[10px] uppercase">
            {snap.mode === "live" ? snap.network : "sim"}
          </Badge>
        )}
      </div>
      {snap && (
        <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          <div className="truncate font-mono" title={snap.vaultId}>
            {shortAccount(snap.vaultId)}
          </div>
          <div>
            Epoch {snap.status.epoch} ·{" "}
            {snap.accessKeys.filter((k) => k.permission !== "FullAccess").length} live keys
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/" onClick={onNavigate} className="rounded-lg px-1 py-1">
        <Logo />
      </Link>
      <nav className="flex flex-col gap-1" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <VaultPill />
        <Separator />
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <GitHubMark className="size-4" />
          Source on GitHub
          <ExternalLink className="ml-auto size-3.5" />
        </a>
        <p className="px-3 text-[11px] leading-relaxed text-muted-foreground">
          Built at NEAR HACKATHON 2026 · AI Security &amp; Defense
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { snap } = useVault();
  const current = NAV.find((n) =>
    n.href === "/" ? pathname === "/" : pathname.startsWith(n.href),
  );
  const explorer = snap ? accountLink(snap.explorerUrl, snap.vaultId) : null;

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card md:block">
        <SidebarNav />
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] md:px-8">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <SidebarNav onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-muted-foreground sm:inline">Telltale</span>
              <span className="hidden text-muted-foreground sm:inline">/</span>
              <span className="truncate font-medium">{current?.label ?? "Telltale"}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {snap && (
                <span className="flex items-center gap-2 rounded-full border bg-card px-2.5 py-1 text-xs font-medium md:hidden">
                  <Lamp state={snap.status.frozen ? "tripped" : "armed"} className="size-2" />
                  {snap.status.frozen ? "Tripped" : "Armed"}
                </span>
              )}
              {explorer && (
                <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
                  <a href={explorer} target="_blank" rel="noreferrer">
                    NearBlocks <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] py-8 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
