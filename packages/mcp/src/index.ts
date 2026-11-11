#!/usr/bin/env bun
/**
 * Telltale MCP server over stdio. Add it to any MCP client, for example:
 *   { "command": "bun", "args": ["packages/mcp/src/index.ts"],
 *     "env": { "TELLTALE_REPORT_URL": "...", "REPORT_HMAC_SECRET": "...", "VAULT_ACCOUNT_ID": "..." } }
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { sendReport, VaultClient } from "@telltale/core";
import { createTelltaleMcpServer } from "./server";

const reportUrl = process.env.TELLTALE_REPORT_URL ?? "http://localhost:3000/api/report";
const secret = process.env.REPORT_HMAC_SECRET;
if (!secret) {
  console.error("REPORT_HMAC_SECRET is required. See .env.example.");
  process.exit(1);
}
const vaultId = process.env.VAULT_ACCOUNT_ID;
const vault = vaultId
  ? new VaultClient(vaultId, process.env.NEAR_RPC_URL ?? "https://test.rpc.fastnear.com")
  : null;

const server = createTelltaleMcpServer({
  report: (detail) => sendReport(reportUrl, secret, { kind: "decoy_tool", detail }),
  status: vault ? () => vault.getStatus() : undefined,
  // stdout carries the MCP protocol; logs go to stderr.
  log: (line) => console.error(`[telltale] ${line}`),
});

await server.connect(new StdioServerTransport());
console.error(`[telltale] MCP server ready; reports go to ${reportUrl}`);
