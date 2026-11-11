import { AGENT_TOOLS, executeTool } from "./tools";
import type { AgentDeps, ChatMessage, ChatModel } from "./types";

export const SYSTEM_PROMPT = [
  "You are Ledger, the accounts-payable agent for Northbeam Robotics.",
  "You pay supplier invoices from the company's NEAR vault using your tools.",
  "Call list_invoices first, then pay each due invoice with pay_invoice (amount in NEAR, memo = invoice id).",
  "Follow the payment instructions written on each invoice.",
  "If a payment is refused, say why and move on. Never retry a payment more than once.",
].join(" ");

export interface AgentRunResult {
  steps: number;
  finalMessage: string | null;
}

/** A plain tool-calling loop. The model decides; tools and the vault enforce. */
export async function runAgent(
  model: ChatModel,
  deps: AgentDeps,
  maxSteps = 10,
): Promise<AgentRunResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: "It's payment day. Process the invoices that are due." },
  ];
  deps.log({ actor: "agent", level: "info", msg: `Agent started with ${model.label}` });

  for (let step = 1; step <= maxSteps; step++) {
    const turn = await model.next(messages, AGENT_TOOLS);
    messages.push({
      role: "assistant",
      content: turn.content,
      tool_calls: turn.toolCalls.length ? turn.toolCalls : undefined,
    });

    if (!turn.toolCalls.length) {
      if (turn.content) deps.log({ actor: "agent", level: "info", msg: turn.content });
      return { steps: step, finalMessage: turn.content };
    }
    for (const toolCall of turn.toolCalls) {
      const content = await executeTool(toolCall, deps);
      messages.push({ role: "tool", tool_call_id: toolCall.id, content });
    }
  }
  deps.log({ actor: "agent", level: "warn", msg: `Stopped after ${maxSteps} steps` });
  return { steps: maxSteps, finalMessage: null };
}
