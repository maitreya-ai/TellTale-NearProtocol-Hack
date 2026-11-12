"use client";

import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Copy,
  CornerDownLeft,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  Plug,
  Search,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { REPO_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { accountLink } from "./format";
import { useVault } from "./vault-provider";

interface Item {
  group: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
  keywords?: string;
}

export const PAGES = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/keys", label: "Keys", icon: KeyRound },
  { href: "/policy", label: "Policy", icon: SlidersHorizontal },
  { href: "/lab", label: "Attack lab", icon: FlaskConical },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/how-it-works", label: "How it works", icon: BookOpen },
] as const;

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-sans text-[10px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { snap } = useVault();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => router.push(href);
    const list: Item[] = PAGES.map((p) => ({
      group: "Pages",
      label: p.label,
      icon: p.icon,
      run: go(p.href),
    }));
    list.push({
      group: "Actions",
      label: "Run an attack",
      icon: FlaskConical,
      run: go("/lab"),
      keywords: "scenario red team steal",
    });
    if (snap) {
      list.push({
        group: "Actions",
        label: "Copy vault address",
        icon: Copy,
        keywords: snap.vaultId,
        run: () => {
          void navigator.clipboard?.writeText(snap.vaultId);
          toast.success("Vault address copied", { description: snap.vaultId });
        },
      });
      const explorer = accountLink(snap.explorerUrl, snap.vaultId);
      if (explorer && snap.mode === "live")
        list.push({
          group: "Actions",
          label: "Open vault on NearBlocks",
          icon: ArrowUpRight,
          run: () => window.open(explorer, "_blank", "noopener"),
        });
    }
    list.push(
      { group: "Links", label: "Back to website", icon: ArrowLeft, run: go("/") },
      {
        group: "Links",
        label: "Source on GitHub",
        icon: ArrowUpRight,
        run: () => window.open(REPO_URL, "_blank", "noopener"),
      },
    );
    return list;
  }, [router, snap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.label} ${i.keywords ?? ""}`.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => setActive(0), [query, open]);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const select = (item: Item | undefined) => {
    if (!item) return;
    onOpenChange(false);
    item.run();
  };

  let index = -1;
  const groups = [...new Set(filtered.map((i) => i.group))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">Jump to a page or run an action.</DialogDescription>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                select(filtered[active]);
              }
            }}
            placeholder="Search pages and actions…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Kbd>esc</Kbd>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No results.</p>
          )}
          {groups.map((group) => (
            <div key={group} className="pb-1">
              <div className="px-2 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">
                {group}
              </div>
              {filtered
                .filter((i) => i.group === group)
                .map((item) => {
                  index += 1;
                  const i = index;
                  const Icon = item.icon;
                  return (
                    <button
                      key={`${group}-${item.label}`}
                      type="button"
                      data-index={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => select(item)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm",
                        active === i ? "bg-accent text-accent-foreground" : "text-foreground",
                      )}
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {item.label}
                      {active === i && (
                        <CornerDownLeft className="ml-auto size-3.5 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> to navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> to select
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
