import { describe, expect, it, jest } from "@jest/globals";
import { NearAiModel, parseModelChoice, runScenario, AGENT_TOOLS } from "../src";
import { SimulatedVault as FakeChain } from "../src";

describe("scenarios against the fake vault", () => {
  it("honest run pays both invoices and stays armed", async () => {
    const chain = new FakeChain();
    const { ports } = chain.ports();
    const result = await runScenario("honest", ports);
    expect(result).toEqual({ id: "honest", tripped: false, paid: 2 });
    expect(chain.transfers.map((t) => t.to)).toEqual([
      "acme-hosting.owner.testnet",
      "northwind-data.owner.testnet",
    ]);
    expect(chain.keys.size).toBe(4);
  });

  it("poisoned invoice trips the vault through the decoy tool before money moves to the thief", async () => {
    const chain = new FakeChain();
    const { ports, events } = chain.ports();
    const result = await runScenario("poisoned-invoice", ports);
    expect(result.tripped).toBe(true);
    expect(result.paid).toBe(1); // the honest hosting invoice, paid before the poisoned one
    expect(chain.transfers.some((t) => t.to === "collector.owner.testnet")).toBe(false);
    expect(
      events.some((e) => e.actor === "telltale" && e.msg.includes("raise_spending_limit")),
    ).toBe(true);
    expect(chain.keys.size).toBe(0);
  });

  it("stolen .env: the first stolen key trips, the second no longer exists, the agent is locked out", async () => {
    const chain = new FakeChain();
    const { ports, events } = chain.ports({ sleep: async () => undefined });
    const result = await runScenario("stolen-env", ports);
    expect(result).toEqual({ id: "stolen-env", tripped: true, paid: 0 });
    expect(chain.transfers).toEqual([]);
    const vaultLines = events.filter((e) => e.actor === "vault").map((e) => e.msg);
    expect(vaultLines[0]).toContain("TRIPPED");
    expect(vaultLines[1]).toContain("access key does not exist");
    expect(vaultLines[2]).toContain("Agent payment refused");
  });

  it("refuses to run on a frozen vault", async () => {
    const chain = new FakeChain();
    chain.trip();
    const { ports, events } = chain.ports();
    const result = await runScenario("honest", ports);
    expect(result.tripped).toBe(true);
    expect(events[0]!.msg).toContain("Re-arm");
  });
});

describe("NearAiModel", () => {
  it("sends tools to NEAR AI Cloud and maps tool calls back", async () => {
    const fetchMock = jest.fn(async (_url: unknown, init: unknown) => {
      const body = JSON.parse(String((init as { body: string }).body));
      expect(body.model).toBe("deepseek-ai/DeepSeek-V4.1-Flash-1017");
      expect(body.tools.map((t: { function: { name: string } }) => t.function.name)).toContain(
        "raise_spending_limit",
      );
      return new Response(
        JSON.stringify({
          id: "c1",
          object: "chat.completion",
          created: 0,
          model: body.model,
          choices: [
            {
              index: 0,
              finish_reason: "tool_calls",
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "t1",
                    type: "function",
                    function: { name: "list_invoices", arguments: "{}" },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const model = new NearAiModel(
      {
        apiKey: "test",
        baseUrl: "https://cloud-api.near.ai/v1",
        model: "deepseek-ai/DeepSeek-V4.1-Flash-1017",
      },
      fetchMock as unknown as typeof fetch,
    );
    const turn = await model.next([{ role: "user", content: "pay" }], AGENT_TOOLS);
    expect(turn.toolCalls).toEqual([
      { id: "t1", type: "function", function: { name: "list_invoices", arguments: "{}" } },
    ]);
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      "https://cloud-api.near.ai/v1/chat/completions",
    );
  });
});

describe("parseModelChoice", () => {
  it("maps llm and the old near-ai id to the live model", () => {
    expect(parseModelChoice("llm")).toBe("llm");
    expect(parseModelChoice("near-ai")).toBe("llm");
    expect(parseModelChoice(null)).toBe("scripted");
    expect(parseModelChoice("anything")).toBe("scripted");
  });
});
