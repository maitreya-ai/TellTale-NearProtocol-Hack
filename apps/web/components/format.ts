const YOCTO = 10n ** 24n;

export function near(yocto: string | bigint, decimals = 3): string {
  const value = BigInt(yocto);
  const whole = value / YOCTO;
  const fraction = (value % YOCTO)
    .toString()
    .padStart(24, "0")
    .slice(0, decimals)
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function shortKey(key: string): string {
  const [curve, body = ""] = key.split(":");
  return `${curve}:${body.slice(0, 8)}…${body.slice(-6)}`;
}

export function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

export function ago(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export const CAUSE_LABEL: Record<string, string> = {
  stolen_key: "Stolen key used without a proof",
  decoy_tool: "Agent called a decoy tool",
  decoy_credential: "Decoy credential used",
  manual: "Manual freeze",
  strikes: "Too many denied payments",
};

export function txLink(explorerUrl: string, tx: string): string | null {
  return explorerUrl ? `${explorerUrl.replace(/\/$/, "")}/txns/${tx}` : null;
}

export function accountLink(explorerUrl: string, account: string): string | null {
  return explorerUrl ? `${explorerUrl.replace(/\/$/, "")}/address/${account}` : null;
}
