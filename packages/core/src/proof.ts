import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { KeyPair, PublicKey, type KeyPairString } from "near-api-js";

/** First line of every proof message. Must match `PROOF_DOMAIN` in the contract. */
export const PROOF_DOMAIN = "telltale-pay-v1";

export interface ProofFields {
  /** Vault account the payment is made from. */
  vaultId: string;
  /** Public key of the access key that signs the transaction, "ed25519:…". */
  signingKey: string;
  receiverId: string;
  /** yoctoNEAR as a decimal string or bigint. */
  amount: string | bigint;
  /** u64 as number, bigint or decimal string. */
  nonce: number | bigint | string;
  memo?: string | null;
}

/**
 * Builds the exact message the signer service signs. The Rust contract builds
 * the same bytes in `proof_message`; test vectors keep the two in sync.
 */
export function proofMessage(fields: ProofFields): string {
  const memoHash = bytesToHex(sha256(utf8ToBytes(fields.memo ?? "")));
  return [
    PROOF_DOMAIN,
    `vault:${fields.vaultId}`,
    `key:${fields.signingKey}`,
    `to:${fields.receiverId}`,
    `amount:${BigInt(fields.amount).toString()}`,
    `nonce:${BigInt(fields.nonce).toString()}`,
    `memo:${memoHash}`,
  ].join("\n");
}

/** Signs a payment proof with the signer's ed25519 secret. Returns base64. */
export function signProof(proofSecret: KeyPairString, fields: ProofFields): string {
  const keyPair = KeyPair.fromString(proofSecret);
  const { signature } = keyPair.sign(utf8ToBytes(proofMessage(fields)));
  return Buffer.from(signature).toString("base64");
}

/** Checks a base64 proof against the signer's public key. */
export function verifyProof(
  signerPublicKey: string,
  fields: ProofFields,
  proofB64: string,
): boolean {
  const signature = Uint8Array.from(Buffer.from(proofB64, "base64"));
  if (signature.length !== 64) return false;
  return PublicKey.fromString(signerPublicKey).verify(utf8ToBytes(proofMessage(fields)), signature);
}
