/**
 * Uploads the Worker's secrets from .env.local with `wrangler secret bulk`.
 * Deploy the Worker first. Prints names only with --dry-run.
 *   bun run cf:secrets [--dry-run]
 */
import { spawnSync } from "node:child_process";
import { WEB_VARS } from "./lib/env-file";
import { flag } from "./lib/cli";

// Public settings live in wrangler.jsonc "vars"; everything else is a secret.
const PUBLIC = new Set([
  "NEAR_NETWORK",
  "NEAR_RPC_URL",
  "NEAR_EXPLORER_URL",
  "NEAR_AI_BASE_URL",
  "NEAR_AI_MODEL",
  "GROQ_MODEL",
]);
const secrets = Object.fromEntries(
  WEB_VARS.filter((key) => !PUBLIC.has(key) && process.env[key]).map((key) => [
    key,
    process.env[key]!,
  ]),
);
console.log(
  `Secrets to upload (${Object.keys(secrets).length}): ${Object.keys(secrets).join(", ")}`,
);
if (flag("--dry-run")) process.exit(0);

// Secrets go through stdin, never through a file on disk.
const result = spawnSync("bunx", ["wrangler", "secret", "bulk", "--name", "telltale"], {
  cwd: "apps/web",
  input: JSON.stringify(secrets),
  stdio: ["pipe", "inherit", "inherit"],
});
process.exit(result.status ?? 1);
