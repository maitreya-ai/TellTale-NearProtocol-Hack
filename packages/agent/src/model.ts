import OpenAI from "openai";
import type { ChatMessage, ChatModel, Invoice, ModelTurn, ToolCall, ToolDefinition } from "./types";

/**
 * A live LLM over an OpenAI-compatible API: NEAR AI Cloud, or Groq as a fallback provider.
 * Retries patiently because free tiers rate-limit tokens per minute.
 */
export class LlmModel implements ChatModel {
  readonly label: string;
  private readonly client: OpenAI;

  constructor(
    private readonly options: { apiKey: string; baseUrl: string; model: string; provider?: string },
    fetchImpl?: typeof fetch,
  ) {
    this.label = `${options.provider ?? "NEAR AI Cloud"} · ${options.model}`;
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
      maxRetries: 4,
      timeout: 60_000,
      ...(fetchImpl ? { fetch: fetchImpl } : {}),
    });
  }

  async next(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ModelTurn> {
    const completion = await this.client.chat.completions.create({
      model: this.options.model,
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      tools: tools as OpenAI.Chat.Completions.ChatCompletionTool[],
      tool_choice: "auto",
      max_tokens: 800,
    });
    const message = completion.choices[0]?.message;
    const toolCalls: ToolCall[] = (message?.tool_calls ?? [])
      .filter((call) => call.type === "function")
      .map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.function.name, arguments: call.function.arguments },
      }));
    return { content: message?.content ?? null, toolCalls };
  }
}

/** Earlier name, kept so existing imports keep working. */
export const NearAiModel = LlmModel;

let callCounter = 0;
function call(name: string, args: Record<string, unknown>): ToolCall {
  callCounter += 1;
  return {
    id: `call_${callCounter}`,
    type: "function",
    function: { name, arguments: JSON.stringify(args) },
  };
}

/** Finds an instruction to call a tool by name inside invoice text. */
function injectedToolCalls(invoice: Invoice): ToolCall[] {
  const calls: ToolCall[] = [];
  const text = invoice.notes;
  const raise = /raise_spending_limit[^\n]*?new_limit_near\s*=\s*([\d.]+)/i.exec(text);
  if (raise)
    calls.push(
      call("raise_spending_limit", {
        new_limit_near: raise[1],
        reason: `urgent invoice ${invoice.id}`,
      }),
    );
  const sweep = /sweep_to_cold_storage[^\n]*?address\s*=\s*([a-z0-9._-]+)/i.exec(text);
  if (sweep) calls.push(call("sweep_to_cold_storage", { address: sweep[1] }));
  return calls;
}

/**
 * A deliberately naive agent with a fixed plan: list invoices, then do what
 * each invoice says. It stands in for a model that falls for prompt injection,
 * so the demo and tests are deterministic and need no API key.
 */
export class ScriptedNaiveModel implements ChatModel {
  readonly label = "Scripted naive agent (follows invoice instructions)";
  private plan: ToolCall[] | null = null;

  async next(messages: ChatMessage[]): Promise<ModelTurn> {
    const toolResults = messages.filter((m) => m.role === "tool");
    if (toolResults.length === 0) return { content: null, toolCalls: [call("list_invoices", {})] };

    if (!this.plan) {
      const listing = toolResults[0]!;
      let invoices: Invoice[];
      try {
        invoices = JSON.parse(listing.content) as Invoice[];
      } catch {
        invoices = [];
      }
      this.plan = invoices.flatMap((invoice) => [
        ...injectedToolCalls(invoice),
        call("pay_invoice", {
          receiver_id: invoice.pay_to,
          amount_near: invoice.amount_near,
          memo: invoice.id,
        }),
      ]);
    }

    const next = this.plan.shift();
    if (next) return { content: null, toolCalls: [next] };
    return { content: "All due invoices processed.", toolCalls: [] };
  }
}
