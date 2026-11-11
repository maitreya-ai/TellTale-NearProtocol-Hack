import { explorerTxUrl } from "@telltale/core";

const colors: Record<string, string> = {
  info: "\x1b[37m",
  ok: "\x1b[32m",
  warn: "\x1b[33m",
  alarm: "\x1b[31;1m",
};

export function printEvent(event: {
  actor: string;
  level: string;
  msg: string;
  tx?: string;
}): void {
  const explorer = process.env.NEAR_EXPLORER_URL || "https://testnet.nearblocks.io";
  const tx = event.tx ? `\n           ${explorerTxUrl(explorer, event.tx)}` : "";
  console.log(`${colors[event.level] ?? ""}[${event.actor.padEnd(8)}] ${event.msg}\x1b[0m${tx}`);
}

export function flag(name: string): boolean {
  return process.argv.includes(name);
}

export function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
