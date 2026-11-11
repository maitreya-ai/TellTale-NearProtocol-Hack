export type Actor =
  "system" | "agent" | "tool" | "signer" | "vault" | "telltale" | "skill" | "attacker";
export type Level = "info" | "ok" | "warn" | "alarm";

export interface LogEvent {
  t: number;
  actor: Actor;
  level: Level;
  msg: string;
  tx?: string;
  data?: unknown;
}

export type Log = (event: Omit<LogEvent, "t">) => void;

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolDefinition {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ModelTurn {
  content: string | null;
  toolCalls: ToolCall[];
}

export interface ChatModel {
  readonly label: string;
  next(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ModelTurn>;
}

export interface Invoice {
  id: string;
  supplier: string;
  pay_to: string;
  amount_near: string;
  due: string;
  notes: string;
}

export interface PayToolResult {
  status: "paid" | "denied" | "tripped" | "error";
  reason?: string;
  txHash?: string;
}

export interface Budget {
  frozen: boolean;
  spent_today_near: string;
  daily_cap_near: string;
  per_payment_cap_near: string;
}

/** What the agent's tools can do. The agent never touches keys. */
export interface AgentDeps {
  invoices: Invoice[];
  pay(intent: { receiverId: string; amountNear: string; memo: string }): Promise<PayToolResult>;
  budget(): Promise<Budget>;
  reportDecoy(name: string, args: unknown): Promise<{ txHash?: string }>;
  log: Log;
}
