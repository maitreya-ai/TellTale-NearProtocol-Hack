"use client";

import { ArrowUpRight, Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { fmtNear, fmtTime, vaultEvents, type VaultEvent } from "../events";
import { ago } from "../format";
import { EmptyState, PageHeader } from "../kit";
import { Notices } from "../overview";
import { useVault } from "../vault-provider";

type Filter = "all" | "payment" | "trip";

function EventIcon({ kind }: { kind: VaultEvent["kind"] }) {
  return kind === "trip" ? (
    <span className="grid size-7 flex-none place-items-center rounded-md bg-tripped-soft text-tripped">
      <ShieldAlert className="size-3.5" />
    </span>
  ) : (
    <span className="grid size-7 flex-none place-items-center rounded-md bg-armed-soft text-armed">
      <ArrowUpRight className="size-3.5" />
    </span>
  );
}

export default function ActivityPage() {
  const { snap } = useVault();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const all = useMemo(() => (snap ? vaultEvents(snap) : []), [snap]);
  const counts = {
    all: all.length,
    payment: all.filter((e) => e.kind === "payment").length,
    trip: all.filter((e) => e.kind === "trip").length,
  };
  const rows = all.filter((e) => {
    if (filter !== "all" && e.kind !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || `${e.title} ${e.account ?? ""} ${e.detail ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <>
      <PageHeader
        title="Activity"
        description="Every payment and every trip the vault contract has recorded."
      />
      <Notices />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center">
          <div className="inline-flex h-8 w-fit items-center rounded-lg bg-muted p-[3px] text-sm">
            {(
              [
                ["all", "All"],
                ["payment", "Payments"],
                ["trip", "Trips"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "flex h-full items-center gap-1.5 rounded-md px-2.5 font-medium transition-colors",
                  filter === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {counts[value]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by account or memo"
              className="h-8 bg-card pl-8 text-sm"
            />
          </div>
        </div>

        {!snap ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            className="m-4"
            icon={<Search className="size-4" />}
            title={all.length ? "No matching events" : "No activity yet"}
            description={
              all.length
                ? "Try a different filter."
                : "Run a scenario in the attack lab to create payments and trips."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Event</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Epoch</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead className="pr-4 text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <EventIcon kind={e.kind} />
                        <div className="min-w-0">
                          <div
                            className={cn(
                              "text-sm font-medium",
                              e.kind === "trip" && "text-tripped",
                            )}
                          >
                            {e.kind === "trip" ? e.title : "Payment sent"}
                          </div>
                          <div className="max-w-80 truncate text-xs text-muted-foreground">
                            {e.kind === "trip"
                              ? `${e.keysDeleted} keys deleted · ${e.detail ?? ""}`
                              : (e.detail ?? "Signer proof verified")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.account ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {e.amount !== undefined ? `${fmtNear(e.amount)} NEAR` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {e.epoch}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {e.blockHeight ?? "—"}
                    </TableCell>
                    <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger className="cursor-default">{ago(e.at)}</TooltipTrigger>
                        <TooltipContent>{fmtTime(e.at)}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            Showing {rows.length} of {all.length} events
          </span>
          <span className="hidden font-mono sm:inline">get_payments · get_trips</span>
        </div>
      </Card>
    </>
  );
}
