/**
 * Creates the Telltale demo on NEAR testnet under OWNER_ACCOUNT_ID:
 * vault, reporter, two suppliers and a collector sub-account; deploys and
 * initialises the contract; adds the epoch-0 agent keys and the reporter.
 * Writes generated values to .env.local and apps/web/.dev.vars.
 *
 *   bun run setup:testnet              first run
 *   bun run setup:testnet --redeploy   upload new contract code to the existing vault
 */
import { existsSync, readFileSync } from "node:fs";
import {
  deriveAgentKeys,
  explorerAccountUrl,
  explorerTxUrl,
  formatNear,
  nearToYoctoExact,
  ownerConfig,
  randomHex,
  randomKey,
  VaultClient,
  type Policy,
} from "@telltale/core";
import {
  Account,
  actions,
  JsonRpcProvider,
  KeyPair,
  teraToGas,
  type KeyPairString,
} from "near-api-js";
import { flag } from "./lib/cli";
import { mergeEnvFile, writeDevVars } from "./lib/env-file";

const ROOT_ENV = ".env.local";
const DEV_VARS = "apps/web/.dev.vars";
const WASM = "contracts/vault/target/near/telltale_vault.wasm";
const env = process.env;

if ((env.NEAR_NETWORK || "testnet") !== "testnet")
  throw new Error("setup-testnet only runs on testnet");
const rpcUrl = env.NEAR_RPC_URL || "https://test.rpc.fastnear.com";
const explorer = env.NEAR_EXPLORER_URL || "https://testnet.nearblocks.io";
const { ownerId, ownerKey } = ownerConfig();
if (/^[0-9a-f]{64}$/.test(ownerId))
  throw new Error(
    "OWNER_ACCOUNT_ID must be a named account (e.g. team.testnet) so it can create sub-accounts",
  );
if (!existsSync(WASM)) throw new Error(`Missing ${WASM}. Run \`bun run contract:build\` first.`);

const provider = new JsonRpcProvider({ url: rpcUrl });
const owner = new Account(ownerId, provider, ownerKey);
const ownerPublicKey = KeyPair.fromString(ownerKey).getPublicKey().toString();
const updates: Record<string, string> = {};
const log = (msg: string) => console.log(`• ${msg}`);

async function exists(accountId: string): Promise<boolean> {
  try {
    await provider.viewAccount({ accountId });
    return true;
  } catch {
    return false;
  }
}

async function ensureSubAccount(
  prefix: string,
  near: string,
  publicKey = ownerPublicKey,
): Promise<{ id: string; created: boolean }> {
  const id = `${prefix}.${ownerId}`;
  if (await exists(id)) {
    log(`${id} already exists`);
    return { id, created: false };
  }
  await owner.createSubAccount({
    accountOrPrefix: prefix,
    publicKey,
    nearToTransfer: nearToYoctoExact(near),
  });
  log(`created ${id} with ${near} NEAR`);
  return { id, created: true };
}

const balance = await owner.getBalance();
log(`owner ${ownerId} has ${formatNear(balance)} NEAR`);

// Secrets kept by the signer and reporter.
const proofSecret = (env.AGENT_PROOF_SECRET as KeyPairString) || randomKey().secret;
const keySeed = env.AGENT_KEY_SEED || randomHex();
const keyCount = Number(env.AGENT_KEY_COUNT || 4);
Object.assign(updates, {
  AGENT_PROOF_SECRET: proofSecret,
  AGENT_KEY_SEED: keySeed,
  AGENT_KEY_COUNT: String(keyCount),
  REPORT_HMAC_SECRET: env.REPORT_HMAC_SECRET || randomHex(),
});
const signerPk = KeyPair.fromString(proofSecret).getPublicKey().toString();

// Accounts.
const deployer = env.VAULT_DEPLOYER_PRIVATE_KEY
  ? { secret: env.VAULT_DEPLOYER_PRIVATE_KEY as KeyPairString }
  : randomKey();
const deployerPk = KeyPair.fromString(deployer.secret).getPublicKey().toString();
const vault = await ensureSubAccount("vault", env.VAULT_FUNDING_NEAR || "6", deployerPk);
const reporterKey = env.REPORTER_PRIVATE_KEY
  ? { secret: env.REPORTER_PRIVATE_KEY as KeyPairString }
  : randomKey();
const reporter = await ensureSubAccount(
  "reporter",
  "0.5",
  KeyPair.fromString(reporterKey.secret).getPublicKey().toString(),
);
const acme = await ensureSubAccount("acme-hosting", "0.1");
const northwind = await ensureSubAccount("northwind-data", "0.1");
const collector = await ensureSubAccount("collector", "0.1");
Object.assign(updates, {
  VAULT_ACCOUNT_ID: vault.id,
  VAULT_DEPLOYER_PRIVATE_KEY: deployer.secret,
  REPORTER_ACCOUNT_ID: reporter.id,
  REPORTER_PRIVATE_KEY: reporterKey.secret,
  SUPPLIER_ACCOUNT_IDS: `${acme.id},${northwind.id}`,
  COLLECTOR_ACCOUNT_ID: collector.id,
});

// Contract.
const code = new Uint8Array(readFileSync(WASM));
const vaultAccount = new Account(vault.id, provider, deployer.secret);
const policy: Policy = {
  per_payment_cap: nearToYoctoExact("0.5").toString(),
  daily_cap: nearToYoctoExact("2").toString(),
  allowlist: [acme.id, northwind.id],
  max_strikes: 3,
};
if (vault.created) {
  const outcome = await vaultAccount.signAndSendTransaction({
    receiverId: vault.id,
    actions: [
      actions.deployContract(code),
      actions.functionCall(
        "new",
        { owner_id: ownerId, signer_pk: signerPk, policy },
        teraToGas("100"),
        0n,
      ),
    ],
  });
  log(
    `deployed and initialised telltale-vault: ${explorerTxUrl(explorer, outcome.transaction_outcome.id)}`,
  );

  const client = new VaultClient(vault.id, rpcUrl);
  const ownerOps = client.owner(ownerId, ownerKey);
  const keys = deriveAgentKeys(keySeed, 0, keyCount).map((k) => k.publicKey);
  const added = await ownerOps.addKeys(keys);
  log(`added ${keys.length} pay-only agent keys: ${explorerTxUrl(explorer, added.txHash)}`);
  const rep = await ownerOps.addReporter(reporter.id);
  log(`registered reporter ${reporter.id}: ${explorerTxUrl(explorer, rep.txHash)}`);
} else if (flag("--redeploy")) {
  const outcome = await vaultAccount.deployContract(code);
  log(`redeployed contract code: ${explorerTxUrl(explorer, outcome.transaction_outcome.id)}`);
} else {
  log("vault already set up; pass --redeploy to upload new contract code");
}

mergeEnvFile(ROOT_ENV, updates);
writeDevVars({ ...env, ...updates }, DEV_VARS);
log(`wrote ${ROOT_ENV} and ${DEV_VARS} (both gitignored)`);

const status = await new VaultClient(vault.id, rpcUrl).getStatus();
console.log(`\nVault ${explorerAccountUrl(explorer, vault.id)}`);
console.log(
  `  armed=${!status.frozen} epoch=${status.epoch} agent keys=${status.managed_key_count} available=${formatNear(status.available)} NEAR`,
);
console.log(`  signer proof key ${signerPk}`);
