import type { KeyPairString } from "near-api-js";
import { deriveAgentKeys, type DerivedKey } from "./keys";
import { signProof } from "./proof";
import type { PayOutcome, TxResult } from "./types";
import type { VaultClient } from "./vault";

export interface PaymentIntent {
  receiverId: string;
  /** yoctoNEAR */
  amount: bigint;
  memo?: string | null;
}

export interface SignerOptions {
  vault: VaultClient;
  proofSecret: KeyPairString;
  keySeed: string;
  keyCount: number;
}

/**
 * The only place real payments are made. Holds the proof secret and the key
 * seed; the agent sends intents and never sees key material.
 */
export class TelltaleSigner {
  private cursor = 0;
  private lastNonce = 0;

  constructor(private readonly options: SignerOptions) {}

  /** Agent keys for the vault's current epoch. */
  async currentKeys(): Promise<DerivedKey[]> {
    const { epoch } = await this.options.vault.getStatus();
    return deriveAgentKeys(this.options.keySeed, epoch, this.options.keyCount);
  }

  /** Strictly increasing millisecond nonce within this process. */
  nextNonce(now: number = Date.now()): number {
    this.lastNonce = Math.max(now, this.lastNonce + 1);
    return this.lastNonce;
  }

  async pay(intent: PaymentIntent): Promise<TxResult<PayOutcome> & { signingKey: string }> {
    const keys = await this.currentKeys();
    // Round-robin so every key's nonce moves and none looks unused.
    const key = keys[this.cursor++ % keys.length]!;
    const nonce = this.nextNonce();
    const memo = intent.memo ?? null;
    const proof = signProof(this.options.proofSecret, {
      vaultId: this.options.vault.vaultId,
      signingKey: key.publicKey,
      receiverId: intent.receiverId,
      amount: intent.amount,
      nonce,
      memo,
    });
    const result = await this.options.vault.pay(key.secret, {
      receiverId: intent.receiverId,
      amount: intent.amount,
      memo,
      nonce,
      proof,
    });
    return { ...result, signingKey: key.publicKey };
  }
}
