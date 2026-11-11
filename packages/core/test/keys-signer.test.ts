import { describe, expect, it, jest } from "@jest/globals";
import { KeyPair } from "near-api-js";
import { deriveAgentKey, deriveAgentKeys, keyFromSeed } from "../src/keys";
import { verifyProof } from "../src/proof";
import { TelltaleSigner } from "../src/signer";
import type { VaultClient } from "../src/vault";
import vectors from "./vectors.json";

const seed = "ab".repeat(32);

describe("agent key derivation", () => {
  it("matches near-api-js for a known seed", () => {
    const v = vectors[0]!;
    const derived = keyFromSeed(Uint8Array.from(Buffer.from(v.signer_seed_hex, "hex")));
    expect(derived.secret).toBe(v.signer_secret);
    expect(derived.publicKey).toBe(v.signer_pk);
    expect(KeyPair.fromString(derived.secret).getPublicKey().toString()).toBe(v.signer_pk);
  });

  it("is deterministic per epoch and index, and different across them", () => {
    expect(deriveAgentKey(seed, 0, 0)).toEqual(deriveAgentKey(seed, 0, 0));
    const epoch0 = deriveAgentKeys(seed, 0, 4).map((k) => k.publicKey);
    const epoch1 = deriveAgentKeys(seed, 1, 4).map((k) => k.publicKey);
    expect(new Set([...epoch0, ...epoch1]).size).toBe(8);
  });
});

describe("TelltaleSigner", () => {
  const proofKey = keyFromSeed(new Uint8Array(32).fill(7));

  function fakeVault(epoch = 3) {
    const pay = jest.fn(async () => ({
      value: { status: "paid", payment_index: "0" } as const,
      txHash: "tx1",
    }));
    const vault = {
      vaultId: "vault.owner.testnet",
      getStatus: async () => ({ epoch }),
      pay,
    } as unknown as VaultClient;
    return { vault, pay };
  }

  it("signs with the current epoch's keys, round-robin, with a valid proof", async () => {
    const { vault, pay } = fakeVault(3);
    const signer = new TelltaleSigner({
      vault,
      proofSecret: proofKey.secret,
      keySeed: seed,
      keyCount: 2,
    });
    const first = await signer.pay({ receiverId: "acme.testnet", amount: 5n, memo: "inv-1" });
    const second = await signer.pay({ receiverId: "acme.testnet", amount: 5n, memo: "inv-2" });
    const keys = deriveAgentKeys(seed, 3, 2);
    expect(first.signingKey).toBe(keys[0]!.publicKey);
    expect(second.signingKey).toBe(keys[1]!.publicKey);

    const [secret, args] = pay.mock.calls[0] as unknown as [
      string,
      { nonce: number; proof: string },
    ];
    expect(secret).toBe(keys[0]!.secret);
    const ok = verifyProof(
      proofKey.publicKey,
      {
        vaultId: "vault.owner.testnet",
        signingKey: keys[0]!.publicKey,
        receiverId: "acme.testnet",
        amount: 5n,
        nonce: args.nonce,
        memo: "inv-1",
      },
      args.proof,
    );
    expect(ok).toBe(true);
  });

  it("never reuses a nonce, even within one millisecond", () => {
    const { vault } = fakeVault();
    const signer = new TelltaleSigner({
      vault,
      proofSecret: proofKey.secret,
      keySeed: seed,
      keyCount: 2,
    });
    expect(signer.nextNonce(1000)).toBe(1000);
    expect(signer.nextNonce(1000)).toBe(1001);
    expect(signer.nextNonce(999)).toBe(1002);
  });
});
