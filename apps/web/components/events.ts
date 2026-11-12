import type { VaultSnapshot } from "@/lib/types";
import { CAUSE_LABEL } from "./format";

const YOCTO = 1e24;

export interface VaultEvent {
  kind: "payment" | "trip";
  id: string;
  at: number;
  epoch: number;
  title: string;
  account?: string;
  /** NEAR, as a float, for payments. */
  amount?: number;
  detail?: string;
  blockHeight?: string;
  keysDeleted?: number;
}

/** Payments and trips merged into one list, newest first. */
export function vaultEvents(snap: VaultSnapshot): VaultEvent[] {
  const payments: VaultEvent[] = snap.payments.map((p) => ({
    kind: "payment",
    id: `p${p.index}`,
    at: p.at,
    epoch: p.epoch,
    title: "Payment",
    account: p.receiverId,
    amount: Number(BigInt(p.amount)) / YOCTO,
    detail: p.memo ?? undefined,
    blockHeight: p.blockHeight,
  }));
  const trips: VaultEvent[] = snap.trips.map((t) => ({
    kind: "trip",
    id: `t${t.index}`,
    at: t.at,
    epoch: t.epoch,
    title: CAUSE_LABEL[t.cause] ?? t.cause,
    detail: t.detail,
    blockHeight: t.blockHeight,
    keysDeleted: t.keysDeleted,
  }));
  return [...payments, ...trips].sort((a, b) => b.at - a.at);
}

export function fmtNear(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}
