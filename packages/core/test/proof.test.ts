import { describe, expect, it } from "@jest/globals";
import type { KeyPairString } from "near-api-js";
import { proofMessage, signProof, verifyProof } from "../src/proof";
import vectors from "./vectors.json";

describe("proof format", () => {
  it.each(vectors)("matches the shared vector for memo %#", (v) => {
    const fields = {
      vaultId: v.vault,
      signingKey: v.key_pk,
      receiverId: v.receiver,
      amount: v.amount,
      nonce: v.nonce,
      memo: v.memo,
    };
    expect(proofMessage(fields)).toBe(v.message);
    expect(signProof(v.signer_secret as KeyPairString, fields)).toBe(v.signature_b64);
    expect(verifyProof(v.signer_pk, fields, v.signature_b64)).toBe(true);
  });

  it("binds the proof to the signing key, amount and receiver", () => {
    const v = vectors[0]!;
    const fields = {
      vaultId: v.vault,
      signingKey: v.key_pk,
      receiverId: v.receiver,
      amount: v.amount,
      nonce: v.nonce,
      memo: v.memo,
    };
    const otherKey = "ed25519:GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB";
    expect(verifyProof(v.signer_pk, { ...fields, signingKey: otherKey }, v.signature_b64)).toBe(
      false,
    );
    expect(verifyProof(v.signer_pk, { ...fields, amount: "501" }, v.signature_b64)).toBe(false);
    expect(
      verifyProof(
        v.signer_pk,
        { ...fields, receiverId: "collector.owner.testnet" },
        v.signature_b64,
      ),
    ).toBe(false);
  });

  it("treats a missing memo like an empty one", () => {
    const base = {
      vaultId: "v.testnet",
      signingKey: "ed25519:x",
      receiverId: "r.testnet",
      amount: 1n,
      nonce: 1,
    };
    expect(proofMessage({ ...base, memo: null })).toBe(proofMessage({ ...base, memo: "" }));
  });

  it("rejects proofs that are not 64 bytes", () => {
    const v = vectors[0]!;
    const fields = {
      vaultId: v.vault,
      signingKey: v.key_pk,
      receiverId: v.receiver,
      amount: v.amount,
      nonce: v.nonce,
      memo: v.memo,
    };
    expect(verifyProof(v.signer_pk, fields, Buffer.from("short").toString("base64"))).toBe(false);
  });
});
