import { existsSync, readFileSync } from "node:fs";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * `next dev` runs in Node, so load the Worker's local settings (.dev.vars, written by
 * `bun run setup:testnet`) into process.env. On Cloudflare, OpenNext copies the Worker's
 * vars and secrets into process.env on every request, so the server code is the same.
 */
function loadDevVars(): void {
  if (!existsSync(".dev.vars")) return;
  for (const line of readFileSync(".dev.vars", "utf8").split("\n")) {
    const [, key, value = ""] = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line) ?? [];
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) loadDevVars();
  return {
    // Workspace packages ship TypeScript source.
    transpilePackages: ["@telltale/core", "@telltale/agent"],
    poweredByHeader: false,
    // Don't write AGENTS.md on `next dev`.
    agentRules: false,
  };
}
