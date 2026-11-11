/**
 * DEMO ATTACK. The thief's side: pull private keys out of the loot and use them
 * to call the vault's `pay` without a signer proof. On Telltale the first call
 * trips the vault, and the remaining stolen keys stop existing.
 */
import { readFileSync } from "node:fs";
import {
  chainConfig,
  demoAccounts,
  explorerTxUrl,
  extractPrivateKeys,
  formatNear,
  VaultClient,
} from "@telltale/core";
import { KeyPair, type KeyPairString } from "near-api-js";
import { sleep } from "../lib/cli";

const chain = chainConfig();
const { collector } = demoAccounts();
const vault = new VaultClient(chain.vaultId, chain.rpcUrl);
const keys = extractPrivateKeys(readFileSync("demo/loot/loot.txt", "utf8")) as KeyPairString[];
console.log(`[attacker] found ${keys.length} private keys for ${chain.vaultId}`);

const [config, before] = await Promise.all([vault.getConfig(), vault.getStatus()]);
const amount = BigInt(config.policy.per_payment_cap);
console.log(
  `[attacker] vault holds ${formatNear(before.available)} NEAR; trying ${formatNear(amount)} NEAR per key`,
);

for (const [index, secret] of keys.entries()) {
  const pk = KeyPair.fromString(secret).getPublicKey().toString();
  process.stdout.write(
    `[attacker] pay(${collector}, ${formatNear(amount)}) with ${pk.slice(0, 18)}… `,
  );
  try {
    const { value, txHash } = await vault.pay(secret, { receiverId: collector, amount });
    console.log(
      `→ ${value.status.toUpperCase()}\n           ${explorerTxUrl(chain.explorerUrl, txHash)}`,
    );
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    console.log(
      `→ rejected: ${/access key/i.test(text) ? "access key does not exist" : text.slice(0, 160)}`,
    );
  }
  if (index === 0) await sleep(3000);
}

const [after, live] = await Promise.all([vault.getStatus(), vault.getAccessKeys()]);
const agentKeys = live.filter((k) => k.permission !== "FullAccess").length;
console.log(
  `\n[vault] frozen=${after.frozen} trips=${after.trip_count} agent keys left=${agentKeys} available=${formatNear(after.available)} NEAR`,
);
