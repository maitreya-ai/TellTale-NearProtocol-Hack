import type { KeyPairString } from "near-api-js";

type Env = Record<string, string | undefined>;

export class MissingEnvError extends Error {
  constructor(readonly missing: string[]) {
    super(`Missing environment variables: ${missing.join(", ")}. See .env.example.`);
    this.name = "MissingEnvError";
  }
}

function pick<K extends string>(env: Env, required: readonly K[]): Record<K, string> {
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) throw new MissingEnvError(missing);
  return Object.fromEntries(required.map((name) => [name, env[name]!.trim()])) as Record<K, string>;
}

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export interface ChainConfig {
  network: string;
  rpcUrl: string;
  explorerUrl: string;
  vaultId: string;
}

export function chainConfig(env: Env = process.env): ChainConfig {
  const { VAULT_ACCOUNT_ID } = pick(env, ["VAULT_ACCOUNT_ID"]);
  return {
    network: env.NEAR_NETWORK || "testnet",
    rpcUrl: env.NEAR_RPC_URL || "https://test.rpc.fastnear.com",
    explorerUrl: env.NEAR_EXPLORER_URL || "https://testnet.nearblocks.io",
    vaultId: VAULT_ACCOUNT_ID,
  };
}

export interface SignerConfig {
  proofSecret: KeyPairString;
  /** 32-byte hex seed; agent keys for each epoch are derived from it. */
  keySeed: string;
  keyCount: number;
}

export function signerConfig(env: Env = process.env): SignerConfig {
  const vars = pick(env, ["AGENT_PROOF_SECRET", "AGENT_KEY_SEED"]);
  if (!/^[0-9a-f]{64}$/i.test(vars.AGENT_KEY_SEED)) {
    throw new Error("AGENT_KEY_SEED must be 32 bytes of hex");
  }
  const keyCount = Number(env.AGENT_KEY_COUNT || 4);
  if (!Number.isInteger(keyCount) || keyCount < 2 || keyCount > 12) {
    throw new Error("AGENT_KEY_COUNT must be an integer from 2 to 12");
  }
  return {
    proofSecret: vars.AGENT_PROOF_SECRET as KeyPairString,
    keySeed: vars.AGENT_KEY_SEED,
    keyCount,
  };
}

export interface ReporterConfig {
  reporterId: string;
  reporterKey: KeyPairString;
  hmacSecret: string;
}

export function reporterConfig(env: Env = process.env): ReporterConfig {
  const vars = pick(env, ["REPORTER_ACCOUNT_ID", "REPORTER_PRIVATE_KEY", "REPORT_HMAC_SECRET"]);
  return {
    reporterId: vars.REPORTER_ACCOUNT_ID,
    reporterKey: vars.REPORTER_PRIVATE_KEY as KeyPairString,
    hmacSecret: vars.REPORT_HMAC_SECRET,
  };
}

export interface OwnerConfig {
  ownerId: string;
  ownerKey: KeyPairString;
}

export function ownerConfig(env: Env = process.env): OwnerConfig {
  const vars = pick(env, ["OWNER_ACCOUNT_ID", "OWNER_PRIVATE_KEY"]);
  return { ownerId: vars.OWNER_ACCOUNT_ID, ownerKey: vars.OWNER_PRIVATE_KEY as KeyPairString };
}

export interface DemoAccounts {
  suppliers: string[];
  collector: string;
}

export function demoAccounts(env: Env = process.env): DemoAccounts {
  const vars = pick(env, ["SUPPLIER_ACCOUNT_IDS", "COLLECTOR_ACCOUNT_ID"]);
  return { suppliers: list(vars.SUPPLIER_ACCOUNT_IDS), collector: vars.COLLECTOR_ACCOUNT_ID };
}

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function aiConfig(env: Env = process.env): AiConfig {
  const { NEAR_AI_API_KEY } = pick(env, ["NEAR_AI_API_KEY"]);
  return {
    apiKey: NEAR_AI_API_KEY,
    baseUrl: env.NEAR_AI_BASE_URL || "https://cloud-api.near.ai/v1",
    model: env.NEAR_AI_MODEL || "deepseek-ai/DeepSeek-V4.1-Flash-1017",
  };
}

export function explorerTxUrl(explorerUrl: string, txHash: string): string {
  return `${explorerUrl.replace(/\/$/, "")}/txns/${txHash}`;
}

export function explorerAccountUrl(explorerUrl: string, accountId: string): string {
  return `${explorerUrl.replace(/\/$/, "")}/address/${accountId}`;
}
