"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  FlaskConical,
  LayoutDashboard,
  Menu,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { REPO_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Lamp, LogoMark, StatusBadge, Wordmark } from "./brand";
import { accountLink, shortAccount } from "./format";
import { GitHubMark } from "./icons";
import { CopyButton } from "./kit";
import { useVault } from "./vault-provider";

type NavItem = { href: string; label: string; icon: LucideIcon };

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Console",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/lab", label: "Attack lab", icon: FlaskConical },
    ],
  },
  {
    label: "Learn",
    items: [{ href: "/how-it-works", label: "How it works", icon: BookOpen }],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

function VaultCard() {
  const { snap } = useVault();
  const tripped = snap?.status.frozen ?? false;
  const keys = snap?.accessKeys.filter((k) => k.permission !== "FullAccess").length ?? 0;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-xs">
      <div className="flex items-center gap-2">
        <Lamp
          state={snap ? (tripped ? "tripped" : "armed") : "idle"}
          ping={Boolean(snap)}
          className="size-1.5"
        />
        <span className={cn("text-xs font-medium", tripped && "text-tripped")}>
          {snap ? (tripped ? "Tripped" : "Armed") : "Connecting…"}
        </span>
        {snap && (
          <span className="ml-auto rounded border px-1.5 py-px font-mono text-[10px] text-muted-foreground uppercase">
            {snap.mode === "live" ? snap.network : "sim"}
          </span>
        )}
      </div>
      {snap && (
        <>
          <div className="mt-2 flex items-center gap-1">
            <span className="truncate font-mono text-[11px]" title={snap.vaultId}>
              {shortAccount(snap.vaultId, 26)}
            </span>
            <CopyButton value={snap.vaultId} className="ml-auto size-5" />
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Epoch {snap.status.epoch} · {keys} agent keys
          </div>
        </>
      )}
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5"
          aria-label="Telltale home"
        >
          <LogoMark className="size-7" />
          <Wordmark className="text-[15px]" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
        <Link
          href="/"
          onClick={onNavigate}
          data-testid="back-home"
          className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Back to home
        </Link>

        {GROUPS.map((group) => (
          <nav key={group.label} aria-label={group.label} className="space-y-1">
            <div className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </div>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        ))}
      </div>

      <div className="space-y-2 border-t p-3">
        <VaultCard />
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <GitHubMark className="size-4" />
          Source
          <ArrowUpRight className="ml-auto size-3.5" />
        </a>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { snap } = useVault();
  const current = ALL.find((n) => pathname.startsWith(n.href));
  const explorer = snap ? accountLink(snap.explorerUrl, snap.vaultId) : null;

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-card md:block">
        <SidebarNav />
      </aside>
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] md:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 md:hidden" aria-label="Menu">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                  className="size-8 bg-card"
                  aria-label="Back to home"
                >
                  <Link href="/">
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to home</TooltipContent>
            </Tooltip>
            <nav aria-label="Breadcrumb" className="ml-1 flex min-w-0 items-center gap-1.5 text-sm">
              <Link
                href="/"
                className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
              >
                Home
              </Link>
              <ChevronRight className="hidden size-3.5 text-muted-foreground sm:inline" />
              <span className="truncate font-medium">{current?.label ?? "Telltale"}</span>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              {snap && <StatusBadge state={snap.status.frozen ? "tripped" : "armed"} />}
              {explorer && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="hidden bg-card sm:inline-flex"
                >
                  <a href={explorer} target="_blank" rel="noreferrer">
                    NearBlocks <ArrowUpRight className="size-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl pt-6 pr-[max(16px,env(safe-area-inset-right,0px))] pb-12 pl-[max(16px,env(safe-area-inset-left,0px))] md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
