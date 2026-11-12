import { existsSync, readFileSync, writeFileSync } from "node:fs";

/** Reads KEY=VALUE lines (no quoting rules beyond trimming). */
export function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) out[match[1]!] = match[2]!;
  }
  return out;
}

/** Updates keys in place and appends new ones, keeping comments and order. */
export function mergeEnvFile(path: string, updates: Record<string, string>): void {
  const lines = existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
  const pending = new Map(Object.entries(updates));
  const next = lines.map((line) => {
    const match = /^\s*([A-Z0-9_]+)\s*=/.exec(line);
    if (match && pending.has(match[1]!)) {
      const value = pending.get(match[1]!)!;
      pending.delete(match[1]!);
      return `${match[1]}=${value}`;
    }
    return line;
  });
  while (next.length && next[next.length - 1] === "") next.pop();
  for (const [key, value] of pending) next.push(`${key}=${value}`);
  writeFileSync(path, `${next.join("\n")}\n`, { mode: 0o600 });
}

/** Variables the web Worker needs, copied from .env.local into apps/web/.dev.vars. */
export const WEB_VARS = [
  "NEAR_NETWORK",
  "NEAR_RPC_URL",
  "NEAR_EXPLORER_URL",
  "VAULT_ACCOUNT_ID",
  "OWNER_ACCOUNT_ID",
  "OWNER_PRIVATE_KEY",
  "REPORTER_ACCOUNT_ID",
  "REPORTER_PRIVATE_KEY",
  "AGENT_PROOF_SECRET",
  "AGENT_KEY_SEED",
  "AGENT_KEY_COUNT",
  "REPORT_HMAC_SECRET",
  "SUPPLIER_ACCOUNT_IDS",
  "COLLECTOR_ACCOUNT_ID",
  "NEAR_AI_API_KEY",
  "NEAR_AI_BASE_URL",
  "NEAR_AI_MODEL",
  "GROQ_API_KEY",
  "GROQ_MODEL",
  "LLM_PROVIDER",
  "DEMO_CONSOLE_TOKEN",
] as const;

export function writeDevVars(rootEnv: Record<string, string | undefined>, path: string): void {
  const lines = [
    "# Generated from .env.local by scripts. Local Worker config; never commit.",
    "TELLTALE_MOCK=0",
    "TELLTALE_DEMO=1",
  ];
  for (const key of WEB_VARS) {
    const value = rootEnv[key];
    if (value) lines.push(`${key}=${value}`);
  }
  writeFileSync(path, `${lines.join("\n")}\n`, { mode: 0o600 });
}
