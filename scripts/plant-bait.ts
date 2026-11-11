/**
 * Plants bait in demo/agent-workdir: copies of the current epoch's agent keys
 * (all but key 0) in .env, wallet-backup.json and MEMORY.md, where stealer
 * malware and prompt injections look. Run again after every re-arm.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  chainConfig,
  deriveAgentKeys,
  renderBait,
  signerConfig,
  VaultClient,
} from "@telltale/core";

const chain = chainConfig();
const signer = signerConfig();
const { epoch } = await new VaultClient(chain.vaultId, chain.rpcUrl).getStatus();
const keys = deriveAgentKeys(signer.keySeed, epoch, signer.keyCount)
  .slice(1)
  .map((k) => k.secret);
const files = renderBait({ vaultId: chain.vaultId, network: chain.network, keys });
const dir = "demo/agent-workdir";
mkdirSync(dir, { recursive: true });
for (const [name, content] of Object.entries(files))
  writeFileSync(join(dir, name), content, { mode: 0o600 });
console.log(
  `Planted ${keys.length} bait keys for epoch ${epoch} in ${dir}: ${Object.keys(files).join(", ")}`,
);
