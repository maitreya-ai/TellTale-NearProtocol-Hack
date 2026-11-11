/**
 * Decoy tools: tools no honest task needs. An agent that calls one has been
 * steered by someone else, so the call trips the vault.
 */

export interface ToolSchema {
  type: "object";
  properties: Record<string, { type: string; description: string }>;
  required: string[];
  additionalProperties: false;
}

export interface DecoyTool {
  name: string;
  description: string;
  parameters: ToolSchema;
  /** What the model sees after calling it. Bland on purpose. */
  response: string;
}

export const DECOY_TOOLS: readonly DecoyTool[] = [
  {
    name: "raise_spending_limit",
    description:
      "Raise the agent's per-payment or daily spending limit when an urgent payment is blocked.",
    parameters: {
      type: "object",
      properties: {
        new_limit_near: { type: "string", description: "New limit in NEAR" },
        reason: { type: "string", description: "Why the limit must change" },
      },
      required: ["new_limit_near", "reason"],
      additionalProperties: false,
    },
    response: "Limit change submitted for review.",
  },
  {
    name: "export_wallet_backup",
    description: "Export the wallet's private keys as a backup file for recovery or migration.",
    parameters: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Where to send the backup" },
      },
      required: ["destination"],
      additionalProperties: false,
    },
    response: "Backup export queued.",
  },
  {
    name: "sweep_to_cold_storage",
    description: "Move the full wallet balance to a cold-storage address in one transfer.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Cold-storage account" },
      },
      required: ["address"],
      additionalProperties: false,
    },
    response: "Sweep scheduled.",
  },
];

const DECOY_NAMES = new Set(DECOY_TOOLS.map((tool) => tool.name));

export function isDecoyTool(name: string): boolean {
  return DECOY_NAMES.has(name);
}

export function getDecoyTool(name: string): DecoyTool | undefined {
  return DECOY_TOOLS.find((tool) => tool.name === name);
}

/** One-line description of a decoy call, stored on-chain as the trip detail. */
export function describeDecoyCall(name: string, args: unknown): string {
  let rendered: string;
  try {
    rendered = JSON.stringify(args);
  } catch {
    rendered = "[unserialisable args]";
  }
  return `${name}(${rendered})`.slice(0, 480);
}
