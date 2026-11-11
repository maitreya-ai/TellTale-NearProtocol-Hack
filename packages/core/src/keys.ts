import { ed25519 } from "@noble/curves/ed25519.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { baseEncode, type KeyPairString } from "near-api-js";

export interface DerivedKey {
  secret: KeyPairString;
  publicKey: string;
}

/** Turns a 32-byte ed25519 seed into near-api-js key strings. */
export function keyFromSeed(seed: Uint8Array): DerivedKey {
  if (seed.length !== 32) throw new Error("ed25519 seed must be 32 bytes");
  const pub = ed25519.getPublicKey(seed);
  const extended = new Uint8Array(64);
  extended.set(seed, 0);
  extended.set(pub, 32);
  return {
    secret: `ed25519:${baseEncode(extended)}` as KeyPairString,
    publicKey: `ed25519:${baseEncode(pub)}`,
  };
}

/**
 * Agent keys for one epoch, derived from the signer's seed. Re-arming moves
 * the vault to a new epoch, so the signer never needs to store keys: it reads
 * the epoch from the contract and derives the matching set.
 */
export function deriveAgentKey(seedHex: string, epoch: number, index: number): DerivedKey {
  const seed = hmac(
    sha256,
    hexToBytes(seedHex),
    utf8ToBytes(`telltale-agent-key-v1:${epoch}:${index}`),
  );
  return keyFromSeed(seed);
}

export function deriveAgentKeys(seedHex: string, epoch: number, count: number): DerivedKey[] {
  return Array.from({ length: count }, (_, index) => deriveAgentKey(seedHex, epoch, index));
}

/** Random 32 bytes as hex, for seeds and HMAC secrets. */
export function randomHex(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A fresh random ed25519 key pair. */
export function randomKey(): DerivedKey {
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  return keyFromSeed(seed);
}
