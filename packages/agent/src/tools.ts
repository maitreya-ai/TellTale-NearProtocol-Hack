import { DECOY_TOOLS, getDecoyTool, isDecoyTool } from "@telltale/core";
import type { AgentDeps, ToolCall, ToolDefinition } from "./types";

const REAL_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "list_invoices",
      description: "List supplier invoices that are due for payment.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "pay_invoice",
      description: "Pay an invoice from the company vault. Amount is in NEAR.",
      parameters: {
        type: "object",
        properties: {
          receiver_id: { type: "string", description: "NEAR account to pay" },
          amount_near: { type: "string", description: "Amount in NEAR, e.g. 0.05" },
          memo: { type: "string", description: "Invoice id" },
        },
        required: ["receiver_id", "amount_near", "memo"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_budget",
      description: "Show today's spending and the vault's limits.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

/** Real tools plus decoys. The agent can't tell them apart, and that's the point. */
export const AGENT_TOOLS: ToolDefinition[] = [
  ...REAL_TOOLS,
  ...DECOY_TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as unknown as Record<string, unknown>,
    },
  })),
];

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const value = JSON.parse(raw || "{}");
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Runs one tool call and returns the text the model sees. */
export async function executeTool(call: ToolCall, deps: AgentDeps): Promise<string> {
  const name = call.function.name;
  const args = parseArgs(call.function.arguments);

  if (isDecoyTool(name)) {
    deps.log({
      actor: "telltale",
      level: "alarm",
      msg: `Decoy tool called: ${name}. Tripping the vault.`,
      data: args,
    });
    const { txHash } = await deps.reportDecoy(name, args);
    deps.log({
      actor: "vault",
      level: "alarm",
      msg: "Vault frozen and agent keys scheduled for deletion.",
      tx: txHash,
    });
    return getDecoyTool(name)!.response;
  }

  switch (name) {
    case "list_invoices":
      deps.log({
        actor: "tool",
        level: "info",
        msg: `list_invoices → ${deps.invoices.length} invoices`,
      });
      return JSON.stringify(deps.invoices);
    case "get_budget": {
      const budget = await deps.budget();
      deps.log({
        actor: "tool",
        level: "info",
        msg: `get_budget → ${budget.spent_today_near}/${budget.daily_cap_near} NEAR today`,
      });
      return JSON.stringify(budget);
    }
    case "pay_invoice": {
      const receiverId = String(args.receiver_id ?? "");
      const amountNear = String(args.amount_near ?? "");
      const memo = String(args.memo ?? "");
      deps.log({
        actor: "agent",
        level: "info",
        msg: `pay_invoice ${amountNear} NEAR → ${receiverId} (${memo})`,
      });
      const result = await deps.pay({ receiverId, amountNear, memo });
      const level =
        result.status === "paid" ? "ok" : result.status === "tripped" ? "alarm" : "warn";
      const detail = result.reason ? `: ${result.reason}` : "";
      deps.log({ actor: "vault", level, msg: `${result.status}${detail}`, tx: result.txHash });
      return JSON.stringify(result);
    }
    default:
      deps.log({ actor: "tool", level: "warn", msg: `Unknown tool ${name}` });
      return JSON.stringify({ error: `unknown tool ${name}` });
  }
}
