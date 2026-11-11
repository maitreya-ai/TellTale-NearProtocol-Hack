/** JSON shapes returned by the telltale-vault contract. Amounts are yoctoNEAR strings. */

export interface Policy {
  per_payment_cap: string;
  daily_cap: string;
  allowlist: string[] | null;
  max_strikes: number;
}

export type ReportKind = "decoy_tool" | "decoy_credential" | "manual";

export type TripCause =
  | { kind: "stolen_key"; public_key: string; reason: string }
  | { kind: "report"; report: ReportKind; detail: string }
  | { kind: "strikes"; count: number };

export interface Trip {
  cause: TripCause;
  epoch: number;
  block_height: string;
  timestamp_ms: string;
  predecessor_id: string;
  signer_pk: string;
  keys_deleted: number;
}

export interface Payment {
  receiver_id: string;
  amount: string;
  memo: string | null;
  epoch: number;
  block_height: string;
  timestamp_ms: string;
  signer_pk: string;
}

export type PayOutcome =
  | { status: "paid"; payment_index: string }
  | { status: "denied"; reason: string; strikes: number }
  | { status: "tripped"; trip_index: string };

export interface VaultStatus {
  frozen: boolean;
  epoch: number;
  managed_key_count: number;
  spent_in_window: string;
  window_start_ms: string;
  strikes: number;
  last_nonce: string;
  balance: string;
  available: string;
  payment_count: string;
  trip_count: string;
}

export interface VaultConfig {
  owner_id: string;
  signer_pk: string;
  policy: Policy;
  reporters: string[];
}

/** An access key currently on the vault account, as the RPC reports it. */
export interface LiveAccessKey {
  public_key: string;
  permission: "FullAccess" | { receiver_id: string; method_names: string[] };
  nonce: string;
}

/** Outcome of a state-changing call, with the transaction hash for explorers. */
export interface TxResult<T> {
  value: T;
  txHash: string;
}
