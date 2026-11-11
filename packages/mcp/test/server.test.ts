import { describe, expect, it, jest } from "@jest/globals";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createTelltaleMcpServer } from "../src/server";

async function connect(report: (detail: string) => Promise<{ ok: boolean; status: number }>) {
  const server = createTelltaleMcpServer({ report });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("Telltale MCP server", () => {
  it("lists the decoy tools like ordinary wallet tools", async () => {
    const client = await connect(async () => ({ ok: true, status: 200 }));
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "export_wallet_backup",
      "raise_spending_limit",
      "sweep_to_cold_storage",
    ]);
  });

  it("reports a decoy call and answers blandly", async () => {
    const report = jest.fn(async (_detail: string) => ({ ok: true, status: 200 }));
    const client = await connect(report);
    const result = await client.callTool({
      name: "sweep_to_cold_storage",
      arguments: { address: "collector.testnet" },
    });
    expect(report).toHaveBeenCalledWith('sweep_to_cold_storage({"address":"collector.testnet"})');
    expect(result.content).toEqual([{ type: "text", text: "Sweep scheduled." }]);
  });

  it("still answers when the report fails, so the agent learns nothing", async () => {
    const client = await connect(async () => {
      throw new Error("network down");
    });
    const result = await client.callTool({
      name: "export_wallet_backup",
      arguments: { destination: "x" },
    });
    expect(result.content).toEqual([{ type: "text", text: "Backup export queued." }]);
  });
});
