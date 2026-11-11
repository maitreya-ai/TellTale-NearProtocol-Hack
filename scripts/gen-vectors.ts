/**
 * Writes packages/core/test/vectors.json: proof messages and signatures for
 * fixed keys. The Rust contract tests and the TS tests both check against it.
 * Run: bun scripts/gen-vectors.ts
 */
import { ed25519 } from "@noble/curves/ed25519.js";
import { baseEncode, type KeyPairString } from "near-api-js";
import { writeFileSync } from "node:fs";
import { proofMessage, signProof } from "@telltale/core";

function keyFromSeed(byte: number) {
  const seed = new Uint8Array(32).fill(byte);
  const pub = ed25519.getPublicKey(seed);
  const secret = `ed25519:${baseEncode(new Uint8Array([...seed, ...pub]))}` as KeyPairString;
  return {
    seedHex: Buffer.from(seed).toString("hex"),
    secret,
    publicKey: `ed25519:${baseEncode(pub)}`,
  };
}

const signer = keyFromSeed(7);
const agent = keyFromSeed(11);
const cases = [
  { receiver: "acme-hosting.owner.testnet", amount: "500", nonce: "42", memo: "invoice" },
  {
    receiver: "acme-hosting.owner.testnet",
    amount: "1000000000000000000000000",
    nonce: "1731369600000",
    memo: "",
  },
  {
    receiver: "northwind-data.owner.testnet",
    amount: "250000000000000000000000",
    nonce: "1731369600001",
    memo: "INV-2026-11 · données ✓",
  },
];

const vectors = cases.map((c) => {
  const fields = {
    vaultId: "vault.owner.testnet",
    signingKey: agent.publicKey,
    receiverId: c.receiver,
    amount: c.amount,
    nonce: c.nonce,
    memo: c.memo,
  };
  return {
    vault: fields.vaultId,
    signer_seed_hex: signer.seedHex,
    signer_secret: signer.secret,
    signer_pk: signer.publicKey,
    key_seed_hex: agent.seedHex,
    key_pk: agent.publicKey,
    receiver: c.receiver,
    amount: c.amount,
    nonce: c.nonce,
    memo: c.memo,
    message: proofMessage(fields),
    signature_b64: signProof(signer.secret, fields),
  };
});

writeFileSync("packages/core/test/vectors.json", JSON.stringify(vectors, null, 2) + "\n");
console.log(`wrote ${vectors.length} vectors`);
