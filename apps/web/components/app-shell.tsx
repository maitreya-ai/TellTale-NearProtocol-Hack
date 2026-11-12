"use client";

import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  Menu,
  Plug,
  Search,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { REPO_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Lamp, LogoMark } from "./brand";
import { CommandMenu, Kbd } from "./command-menu";
import { accountLink, shortAccount } from "./format";
import { GitHubMark } from "./icons";
import { useVault } from "./vault-provider";

type NavItem = { href: string; label: string; icon: LucideIcon; count?: number; alert?: string };

function useNav(): { label: string; items: NavItem[] }[] {
  const { snap } = useVault();
  const keys = snap?.accessKeys.filter((k) => k.permission !== "FullAccess").length;
  const events = snap ? snap.payments.length + snap.trips.length : undefined;
  return [
    {
      label: "Vault",
      items: [
        { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
        { href: "/activity", label: "Activity", icon: Activity, count: events },
        { href: "/keys", label: "Keys", icon: KeyRound, count: keys },
        { href: "/policy", label: "Policy", icon: SlidersHorizontal },
      ],
    },
    {
      label: "Security",
      items: [
        {
          href: "/lab",
          label: "Attack lab",
          icon: FlaskConical,
          alert: snap?.status.frozen ? "Tripped" : undefined,
        },
      ],
    },
    {
      label: "Developers",
      items: [
        { href: "/integrations", label: "Integrations", icon: Plug },
        { href: "/how-it-works", label: "How it works", icon: BookOpen },
      ],
    },
  ];
}

function VaultSwitcher() {
  const { snap } = useVault();
  const explorer = snap ? accountLink(snap.explorerUrl, snap.vaultId) : null;
  const network = snap ? (snap.mode === "live" ? snap.network : "simulation") : "…";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <LogoMark className="size-8" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm leading-tight font-semibold">Telltale</span>
            <span className="block truncate font-mono text-[11px] text-muted-foreground">
              {snap ? shortAccount(snap.vaultId, 24) : "connecting…"}
            </span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Vault</DropdownMenuLabel>
        {snap && (
          <DropdownMenuCheckItem checked className="font-mono text-xs">
            <Lamp state={snap.status.frozen ? "tripped" : "armed"} className="size-1.5" />
            {shortAccount(snap.vaultId, 26)}
          </DropdownMenuCheckItem>
        )}
        <div className="px-2 pb-1.5 text-[11px] text-muted-foreground">Network: {network}</div>
        <DropdownMenuSeparator />
        {snap && (
          <DropdownMenuItem
            onSelect={() => {
              void navigator.clipboard?.writeText(snap.vaultId);
              toast.success("Vault address copied");
            }}
          >
            <Copy /> Copy address
          </DropdownMenuItem>
        )}
        {explorer && snap?.mode === "live" && (
          <DropdownMenuItem asChild>
            <a href={explorer} target="_blank" rel="noreferrer">
              <ArrowUpRight /> View on NearBlocks
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <ArrowLeft /> Back to website
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OwnerRow() {
  const { snap } = useVault();
  if (!snap) return null;
  const owner = snap.config.owner_id;
  const tripped = snap.status.frozen;
  return (
    <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
      <span className="grid size-8 flex-none place-items-center rounded-full bg-zinc-900 text-xs font-semibold text-white uppercase">
        {owner.slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm leading-tight font-medium">{owner}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lamp state={tripped ? "tripped" : "armed"} ping className="size-1.5" />
          Owner · {snap.mode === "live" ? snap.network : "simulation"}
        </span>
      </span>
    </div>
  );
}

function SidebarNav({ onNavigate, onSearch }: { onNavigate?: () => void; onSearch: () => void }) {
  const pathname = usePathname();
  const groups = useNav();
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-2">
        <VaultSwitcher />
      </div>
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-8 w-full items-center gap-2 rounded-md border bg-background px-2.5 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-muted/60"
        >
          <Search className="size-3.5" />
          Search…
          <Kbd className="ml-auto">⌘K</Kbd>
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
        {groups.map((group) => (
          <nav key={group.label} aria-label={group.label} className="space-y-0.5">
            <div className="px-2 pb-1 text-[11px] font-medium text-muted-foreground">
              {group.label}
            </div>
            {group.items.map(({ href, label, icon: Icon, count, alert }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
                    active
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                  {alert ? (
                    <span className="ml-auto rounded bg-tripped-soft px-1.5 text-[10px] font-medium text-tripped">
                      {alert}
                    </span>
                  ) : count !== undefined ? (
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        ))}
      </div>
      <div className="space-y-1 border-t p-2">
        <Link
          href="/"
          onClick={onNavigate}
          data-testid="back-home"
          className="group flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Back to home
        </Link>
        <OwnerRow />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const pathname = usePathname();
  const { snap } = useVault();
  const current = useNav()
    .flatMap((g) => g.items)
    .find((n) => pathname.startsWith(n.href));
  const tripped = snap?.status.frozen ?? false;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card md:block">
        <SidebarNav onSearch={() => setSearch(true)} />
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 pr-[max(16px,env(safe-area-inset-right,0px))] pl-[max(16px,env(safe-area-inset-left,0px))] md:px-6">
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
                <SidebarNav
                  onNavigate={() => setOpen(false)}
                  onSearch={() => {
                    setOpen(false);
                    setSearch(true);
                  }}
                />
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
              <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline">
                {snap ? snap.vaultId : "vault"}
              </span>
              <ChevronRight className="hidden size-3.5 flex-none text-muted-foreground sm:inline" />
              <span className="truncate font-medium">{current?.label ?? "Telltale"}</span>
            </nav>
            <div className="ml-auto flex items-center gap-1.5">
              {snap && (
                <span
                  className={cn(
                    "flex h-7 items-center gap-2 rounded-full border px-2.5 text-xs font-medium",
                    tripped ? "border-tripped/25 bg-tripped-soft text-tripped" : "bg-card",
                  )}
                >
                  <Lamp state={tripped ? "tripped" : "armed"} ping className="size-1.5" />
                  {tripped ? "Tripped" : "Armed"}
                  <span className="hidden text-muted-foreground sm:inline">
                    · {snap.mode === "live" ? snap.network : "simulation"}
                  </span>
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-8 md:hidden"
                aria-label="Search"
                onClick={() => setSearch(true)}
              >
                <Search className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" asChild className="hidden h-8 lg:inline-flex">
                <Link href="/how-it-works">Docs</Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="hidden size-8 sm:inline-flex">
                <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="Source on GitHub">
                  <GitHubMark className="size-4" />
                </a>
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl pt-6 pr-[max(16px,env(safe-area-inset-right,0px))] pb-16 pl-[max(16px,env(safe-area-inset-left,0px))] md:px-6">
          {children}
        </main>
      </div>
      <CommandMenu open={search} onOpenChange={setSearch} />
    </div>
  );
}
