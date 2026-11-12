import {
  aiConfig,
  chainConfig,
  demoAccounts,
  deriveAgentKeys,
  ownerConfig,
  reporterConfig,
  signerConfig,
  TelltaleSigner,
  VaultClient,
  type ReportKind,
} from "@telltale/core";
import type { KeyPairString } from "near-api-js";
import { LlmModel, ScriptedNaiveModel } from "./model";
import type { ScenarioPorts } from "./scenarios";
import type { ChatModel, Log } from "./types";

type Env = Record<string, string | undefined>;

export type ModelChoice = "scripted" | "llm";

/** Parses a model choice from a query string or CLI flag; "near-ai" is the old id for "llm". */
export function parseModelChoice(value: string | null | undefined): ModelChoice {
  return value === "llm" || value === "near-ai" ? "llm" : "scripted";
}

export function pickModel(choice: ModelChoice, env: Env = process.env): ChatModel {
  return choice === "llm" ? new LlmModel(aiConfig(env)) : new ScriptedNaiveModel();
}

export function liveVault(env: Env = process.env) {
  const chain = chainConfig(env);
  return { chain, vault: new VaultClient(chain.vaultId, chain.rpcUrl) };
}

/** Scenario ports wired to the deployed contract on testnet. */
export function livePorts(log: Log, model: ChatModel, env: Env = process.env): ScenarioPorts {
  const { chain, vault } = liveVault(env);
  const signer = signerConfig(env);
  const reporter = reporterConfig(env);
  const demo = demoAccounts(env);
  const telltale = new TelltaleSigner({ vault, ...signer });
  return {
    vaultId: vault.vaultId,
    network: chain.network,
    suppliers: demo.suppliers,
    collector: demo.collector,
    model,
    log,
    status: () => vault.getStatus(),
    config: () => vault.getConfig(),
    signerPay: (intent) => telltale.pay(intent),
    reportDecoy: async (kind, detail) => ({
      txHash: (await vault.report(reporter.reporterId, reporter.reporterKey, kind, detail)).txHash,
    }),
    baitKeys: async () => {
      const { epoch } = await vault.getStatus();
      // Key 0 stays with the signer only; the others are also planted as bait.
      return deriveAgentKeys(signer.keySeed, epoch, signer.keyCount)
        .slice(1)
        .map((k) => k.secret);
    },
    thiefPay: (secret, receiverId, amount) =>
      vault.pay(secret as KeyPairString, { receiverId, amount }),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

/** Owner re-arm: unfreeze and install the next epoch's derived keys. */
export async function liveRearm(
  env: Env = process.env,
): Promise<{ epoch: number; txHash: string }> {
  const { vault } = liveVault(env);
  const signer = signerConfig(env);
  const owner = ownerConfig(env);
  const { epoch } = await vault.getStatus();
  const next = deriveAgentKeys(signer.keySeed, epoch + 1, signer.keyCount).map((k) => k.publicKey);
  const result = await vault.owner(owner.ownerId, owner.ownerKey).rearm(next);
  return { epoch: epoch + 1, txHash: result.txHash };
}

export async function liveReport(
  kind: ReportKind,
  detail: string,
  env: Env = process.env,
): Promise<{ txHash: string }> {
  const { vault } = liveVault(env);
  const reporter = reporterConfig(env);
  return {
    txHash: (await vault.report(reporter.reporterId, reporter.reporterKey, kind, detail)).txHash,
  };
}
