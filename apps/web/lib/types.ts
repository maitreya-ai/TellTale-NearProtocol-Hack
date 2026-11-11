import type { LiveAccessKey, VaultConfig, VaultStatus } from "@telltale/core";

export type TripCauseKind = "stolen_key" | "decoy_tool" | "decoy_credential" | "manual" | "strikes";

export interface TripView {
  index: number;
  cause: TripCauseKind;
  detail: string;
  keysDeleted: number;
  epoch: number;
  at: number;
  blockHeight?: string;
  signerPk?: string;
}

export interface PaymentView {
  index: number;
  receiverId: string;
  amount: string;
  memo: string | null;
  epoch: number;
  at: number;
  blockHeight?: string;
}

export interface VaultSnapshot {
  mode: "live" | "simulation";
  network: string;
  vaultId: string;
  explorerUrl: string;
  status: VaultStatus;
  config: VaultConfig;
  accessKeys: LiveAccessKey[];
  trips: TripView[];
  payments: PaymentView[];
  fetchedAt: number;
}

export interface StreamLine {
  t: number;
  actor: string;
  level: "info" | "ok" | "warn" | "alarm";
  msg: string;
  tx?: string;
  data?: unknown;
}
