"use client";

import { Info, KeyRound, RotateCcw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Lamp } from "../brand";
import { ago, CAUSE_LABEL, shortKey } from "../format";
import { CopyButton, EmptyState, PageHeader } from "../kit";
import { Notices, Panel } from "../overview";
import { useVault } from "../vault-provider";

export default function KeysPage() {
  const { snap } = useVault();
  const keys = snap?.accessKeys ?? [];
  const agentKeys = keys.filter((k) => k.permission !== "FullAccess");

  return (
    <>
      <PageHeader
        title="Keys"
        description={
          snap
            ? `Access keys on ${snap.vaultId}, read live from the chain.`
            : "Access keys on the vault account."
        }
        actions={
          <Button variant="outline" asChild className="bg-card">
            <Link href="/lab">
              <RotateCcw className="size-4" /> Re-arm vault
            </Link>
          </Button>
        }
      />
      <Notices />

      <div className="mb-6 flex gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-xs">
        <Info className="mt-0.5 size-4 flex-none text-muted-foreground" />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Every agent key is a tripwire.</span> Copies
          sit in bait files (.env, wallet backups, agent memory). A key used without the
          signer&apos;s proof trips the vault, and the vault deletes every agent key.
        </p>
      </div>

      <Card className="gap-0 overflow-hidden py-0" data-testid="keys-table">
        {!snap ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : agentKeys.length === 0 && keys.length === 0 ? (
          <EmptyState
            className="m-4"
            icon={<KeyRound className="size-4" />}
            title="No keys on the vault"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Public key</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead className="text-right">Nonce</TableHead>
                  <TableHead className="pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => {
                  const full = k.permission === "FullAccess";
                  return (
                    <TableRow key={k.public_key}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger className="cursor-default font-mono text-xs">
                              {shortKey(k.public_key)}
                            </TooltipTrigger>
                            <TooltipContent className="font-mono">{k.public_key}</TooltipContent>
                          </Tooltip>
                          <CopyButton value={k.public_key} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{full ? "Deployer" : "Agent"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={full ? "outline" : "secondary"}
                          className="rounded-md font-mono text-[11px] font-normal"
                        >
                          {full ? "full access" : "pay only"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {k.nonce.length > 8 ? `…${k.nonce.slice(-6)}` : k.nonce}
                      </TableCell>
                      <TableCell className="pr-4">
                        <span className="flex items-center gap-2 text-xs">
                          <Lamp state="armed" className="size-1.5" />
                          {full ? "Testnet only" : "Live tripwire"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {snap && agentKeys.length === 0 && (
          <div className="flex items-center gap-2 border-t bg-tripped-soft px-4 py-2.5 text-sm text-tripped">
            <ShieldAlert className="size-4" />
            No agent keys: the last trip deleted them. Re-arm to install fresh ones.
          </div>
        )}
      </Card>

      <Panel
        className="mt-6"
        title="Epoch history"
        description="Each re-arm starts a new epoch with fresh keys. Old keys stay dead."
      >
        {snap && (
          <ol className="divide-y border-t">
            <li className="flex items-center gap-3 px-5 py-3">
              <span className="w-16 font-mono text-xs">epoch {snap.status.epoch}</span>
              <span className="flex items-center gap-2 text-sm">
                <Lamp state={snap.status.frozen ? "tripped" : "armed"} ping className="size-1.5" />
                {snap.status.frozen ? "Frozen, waiting for re-arm" : "Active"}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {agentKeys.length} agent keys
              </span>
            </li>
            {snap.trips
              .filter((t) => !(snap.status.frozen && t.epoch === snap.status.epoch))
              .map((t) => (
                <li key={`${t.index}-${t.at}`} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-16 font-mono text-xs text-muted-foreground">
                    epoch {t.epoch}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    Ended by trip #{t.index + 1}: {CAUSE_LABEL[t.cause] ?? t.cause}
                  </span>
                  <span className="ml-auto flex-none text-xs text-muted-foreground">
                    {t.keysDeleted} deleted · {ago(t.at)}
                  </span>
                </li>
              ))}
          </ol>
        )}
      </Panel>
    </>
  );
}
