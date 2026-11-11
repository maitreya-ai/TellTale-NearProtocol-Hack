import {
  deriveAgentKeys,
  keyFromSeed,
  TelltaleSigner,
  verifyProof,
  type PayArgs,
  type PayOutcome,
  type Policy,
  type TxResult,
  type VaultClient,
  type VaultConfig,
  type VaultStatus,
} from "@telltale/core";
import { KeyPair } from "near-api-js";
import { ScriptedNaiveModel } from "./model";
import type { ScenarioPorts } from "./scenarios";
import type { LogEvent } from "./types";

const NEAR = 10n ** 24n;

/**
 * In-memory stand-in for the vault contract that follows the same rules: real
 * proofs, trips, key deletion, allowlist, caps and strikes. Used by tests and
 * by the dashboard's simulation mode (TELLTALE_MOCK=1).
 */
export class SimulatedVault {
  readonly vaultId: string;
  readonly keySeed = "cd".repeat(32);
  readonly proofKey = keyFromSeed(new Uint8Array(32).fill(7));
  readonly policy: Policy = {
    per_payment_cap: (NEAR / 2n).toString(),
    daily_cap: (2n * NEAR).toString(),
    allowlist: ["acme-hosting.owner.testnet", "northwind-data.owner.testnet"],
    max_strikes: 3,
  };
  frozen = false;
  readonly createdAt = Date.now();

  constructor(vaultId = "vault.owner.testnet") {
    this.vaultId = vaultId;
  }

  epoch = 0;
  keys = new Set(deriveAgentKeys(this.keySeed, 0, 4).map((k) => k.publicKey));
  spent = 0n;
  strikes = 0;
  tripCount = 0;
  paymentCount = 0;
  lastNonce = 0n;
  balance = 5n * NEAR;
  transfers: { to: string; amount: bigint }[] = [];
  private tx = 0;

  private hash() {
    this.tx += 1;
    return `tx${this.tx}`;
  }

  status(): VaultStatus {
    return {
      frozen: this.frozen,
      epoch: this.epoch,
      managed_key_count: this.keys.size,
      spent_in_window: this.spent.toString(),
      window_start_ms: "0",
      strikes: this.strikes,
      last_nonce: this.lastNonce.toString(),
      balance: this.balance.toString(),
      available: this.balance.toString(),
      payment_count: String(this.paymentCount),
      trip_count: String(this.tripCount),
    };
  }

  config(): VaultConfig {
    return {
      owner_id: "owner.testnet",
      signer_pk: this.proofKey.publicKey,
      policy: this.policy,
      reporters: ["reporter.owner.testnet"],
    };
  }

  trip(cause = "stolen_key", detail = ""): TxResult<PayOutcome> {
    if (!this.frozen || this.keys.size) {
      this.trips.push({
        cause,
        detail,
        keys_deleted: this.keys.size,
        epoch: this.epoch,
        at: Date.now(),
      });
    }
    this.frozen = true;
    this.keys.clear();
    this.tripCount += 1;
    return {
      value: { status: "tripped", trip_index: String(this.tripCount - 1) },
      txHash: this.hash(),
    };
  }

  pay(secret: string, args: PayArgs): TxResult<PayOutcome> {
    const publicKey = KeyPair.fromString(secret as `ed25519:${string}`)
      .getPublicKey()
      .toString();
    if (!this.keys.has(publicKey))
      throw new Error(`Can't complete the action because access key ${publicKey} doesn't exist`);
    const fields = {
      vaultId: this.vaultId,
      signingKey: publicKey,
      receiverId: args.receiverId,
      amount: args.amount,
      nonce: args.nonce ?? 0,
      memo: args.memo,
    };
    if (
      args.nonce == null ||
      !args.proof ||
      !verifyProof(this.proofKey.publicKey, fields, args.proof)
    ) {
      return this.trip("stolen_key", args.proof ? "invalid proof" : "missing proof");
    }
    if (this.frozen)
      return {
        value: { status: "denied", reason: "vault_frozen", strikes: this.strikes },
        txHash: this.hash(),
      };
    const amount = BigInt(args.amount);
    const deny = (reason: string): TxResult<PayOutcome> => {
      this.strikes += 1;
      if (this.strikes >= this.policy.max_strikes)
        return this.trip("strikes", `${this.strikes} denied payments`);
      return { value: { status: "denied", reason, strikes: this.strikes }, txHash: this.hash() };
    };
    if (!this.policy.allowlist!.includes(args.receiverId)) return deny("receiver_not_allowlisted");
    if (amount > BigInt(this.policy.per_payment_cap)) return deny("over_payment_cap");
    this.spent += amount;
    this.balance -= amount;
    this.paymentCount += 1;
    this.transfers.push({ to: args.receiverId, amount });
    return {
      value: { status: "paid", payment_index: String(this.paymentCount - 1) },
      txHash: this.hash(),
    };
  }

  trips: { cause: string; detail: string; keys_deleted: number; epoch: number; at: number }[] = [];

  rearm(): void {
    this.epoch += 1;
    this.frozen = false;
    this.strikes = 0;
    this.keys = new Set(deriveAgentKeys(this.keySeed, this.epoch, 4).map((k) => k.publicKey));
  }

  /** A VaultClient-shaped object for TelltaleSigner. */
  asClient(): VaultClient {
    return {
      vaultId: this.vaultId,
      getStatus: async () => this.status(),
      pay: async (secret: string, args: PayArgs) => this.pay(secret, args),
    } as unknown as VaultClient;
  }

  ports(overrides: Partial<ScenarioPorts> = {}): { ports: ScenarioPorts; events: LogEvent[] } {
    const events: LogEvent[] = [];
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, Math.min(ms, 400)));
    const signer = new TelltaleSigner({
      vault: this.asClient(),
      proofSecret: this.proofKey.secret,
      keySeed: this.keySeed,
      keyCount: 4,
    });
    const ports: ScenarioPorts = {
      vaultId: this.vaultId,
      network: "testnet",
      suppliers: ["acme-hosting.owner.testnet", "northwind-data.owner.testnet"],
      collector: "collector.owner.testnet",
      model: new ScriptedNaiveModel(),
      log: (event) => events.push({ t: Date.now(), ...event }),
      status: async () => this.status(),
      config: async () => this.config(),
      signerPay: (intent) => signer.pay(intent),
      reportDecoy: async (_kind, detail) => ({ txHash: this.trip("decoy_tool", detail).txHash }),
      baitKeys: async () =>
        deriveAgentKeys(this.keySeed, this.epoch, 4)
          .slice(1)
          .map((k) => k.secret),
      thiefPay: async (secret, receiverId, amount) => this.pay(secret, { receiverId, amount }),
      sleep,
      ...overrides,
    };
    return { ports, events };
  }
}
