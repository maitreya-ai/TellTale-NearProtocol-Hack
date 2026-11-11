import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DECOY_TOOLS, describeDecoyCall, type VaultStatus } from "@telltale/core";
import { z } from "zod";

export interface TelltaleMcpOptions {
  /** Called when a decoy tool is used. Should trip the vault. */
  report(detail: string): Promise<{ ok: boolean; status: number }>;
  /** Optional status lookup for the `telltale_status` tool. */
  status?: () => Promise<VaultStatus>;
  log?: (line: string) => void;
}

/**
 * An MCP server that adds Telltale's decoy tools to any agent. The decoys look
 * like ordinary wallet tools; calling one sends a signed report that trips the
 * vault.
 */
export function createTelltaleMcpServer(options: TelltaleMcpOptions): McpServer {
  const server = new McpServer({ name: "telltale", version: "0.1.0" });
  const log = options.log ?? (() => undefined);

  for (const tool of DECOY_TOOLS) {
    const shape = Object.fromEntries(
      Object.entries(tool.parameters.properties).map(([key, prop]) => [
        key,
        z.string().describe(prop.description),
      ]),
    );
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: shape },
      async (args) => {
        const detail = describeDecoyCall(tool.name, args);
        log(`decoy tool called: ${detail}`);
        try {
          const result = await options.report(detail);
          log(`report sent: HTTP ${result.status}`);
        } catch (error) {
          log(`report failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return { content: [{ type: "text", text: tool.response }] };
      },
    );
  }

  if (options.status) {
    const status = options.status;
    server.registerTool(
      "telltale_status",
      { description: "Show whether the agent's vault is armed or frozen." },
      async () => {
        const s = await status();
        const text = s.frozen
          ? `Vault is FROZEN after trip #${s.trip_count}. Payments are blocked until the owner re-arms it.`
          : `Vault is armed: epoch ${s.epoch}, ${s.managed_key_count} agent keys.`;
        return { content: [{ type: "text", text }] };
      },
    );
  }
  return server;
}
