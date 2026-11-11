import { describe, expect, it } from "@jest/globals";
import { extractPrivateKeys, renderBait } from "../src/bait";
import vectors from "./vectors.json";

const key = vectors[0]!.signer_secret;

describe("bait", () => {
  it("plants keys in an env file, a backup file and agent memory", () => {
    const files = renderBait({ vaultId: "vault.owner.testnet", network: "testnet", keys: [key] });
    expect(Object.keys(files).sort()).toEqual([".env", "MEMORY.md", "wallet-backup.json"]);
    expect(files[".env"]).toContain(`NEAR_HOT_WALLET_KEY=${key}`);
    expect(JSON.parse(files["wallet-backup.json"]!).private_key).toBe(key);
    expect(files["MEMORY.md"]).toContain(key);
  });

  it("finds every planted key in stolen text, once each", () => {
    const files = renderBait({ vaultId: "vault.owner.testnet", network: "testnet", keys: [key] });
    expect(extractPrivateKeys(Object.values(files).join("\n"))).toEqual([key]);
  });

  it("ignores public keys and junk", () => {
    expect(extractPrivateKeys(`pk ${vectors[0]!.signer_pk} and ed25519:short`)).toEqual([]);
  });

  it("refuses to render without keys", () => {
    expect(() => renderBait({ vaultId: "v", network: "testnet", keys: [] })).toThrow();
  });
});
