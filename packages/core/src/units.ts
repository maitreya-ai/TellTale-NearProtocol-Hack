const YOCTO_PER_NEAR = 10n ** 24n;

/** "1.25" NEAR → yoctoNEAR bigint. Rejects negatives and more than 24 decimals. */
export function nearToYoctoExact(near: string | number): bigint {
  const text = String(near).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error(`not a NEAR amount: ${text}`);
  const [whole = "0", fraction = ""] = text.split(".");
  if (fraction.length > 24) throw new Error("NEAR has at most 24 decimals");
  return BigInt(whole) * YOCTO_PER_NEAR + BigInt(fraction.padEnd(24, "0"));
}

/** yoctoNEAR → NEAR string with up to `decimals` places, trailing zeros trimmed. */
export function formatNear(yocto: string | bigint, decimals = 4): string {
  const value = BigInt(yocto);
  const whole = value / YOCTO_PER_NEAR;
  const fraction = (value % YOCTO_PER_NEAR).toString().padStart(24, "0").slice(0, decimals);
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}
