/**
 * Deletes the vault's deployer full-access key, so only the contract controls
 * the account. IRREVERSIBLE: the contract can never be upgraded afterwards.
 *   bun scripts/lock-vault.ts --yes-delete-deployer-key
 */
import { chainConfig } from "@telltale/core";
import { Account, JsonRpcProvider, KeyPair, type KeyPairString } from "near-api-js";
import { flag } from "./lib/cli";

if (!flag("--yes-delete-deployer-key")) {
  console.error(
    "This permanently removes the vault's full-access key. Re-run with --yes-delete-deployer-key to confirm.",
  );
  process.exit(1);
}
const chain = chainConfig();
const secret = process.env.VAULT_DEPLOYER_PRIVATE_KEY as KeyPairString | undefined;
if (!secret) throw new Error("VAULT_DEPLOYER_PRIVATE_KEY is not set");
const account = new Account(chain.vaultId, new JsonRpcProvider({ url: chain.rpcUrl }), secret);
await account.deleteKey(KeyPair.fromString(secret).getPublicKey());
console.log(`${chain.vaultId} is locked: no full-access keys remain.`);
