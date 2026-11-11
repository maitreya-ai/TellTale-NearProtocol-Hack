import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { z } from "zod";

export const REPORT_SIGNATURE_HEADER = "x-telltale-signature";
export const REPORT_MAX_AGE_MS = 60_000;

export const reportBodySchema = z.object({
  kind: z.enum(["decoy_tool", "decoy_credential", "manual"]),
  detail: z.string().min(1).max(480),
  ts: z.number().int().positive(),
});

export type ReportBody = z.infer<typeof reportBodySchema>;

export function signReport(secretHex: string, rawBody: string): string {
  return bytesToHex(hmac(sha256, hexToBytes(secretHex), utf8ToBytes(rawBody)));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type ReportCheck =
  { ok: true; body: ReportBody } | { ok: false; status: 400 | 401 | 409; error: string };

/**
 * Verifies a reporter request: HMAC over the raw body, a fresh timestamp and
 * no replay. `seen` holds signatures already accepted.
 */
export function verifyReport(
  secretHex: string,
  rawBody: string,
  signature: string | null,
  seen: Set<string>,
  now: number = Date.now(),
): ReportCheck {
  if (!signature) return { ok: false, status: 401, error: "missing signature" };
  const expected = signReport(secretHex, rawBody);
  if (!constantTimeEqual(expected, signature.toLowerCase())) {
    return { ok: false, status: 401, error: "bad signature" };
  }
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400, error: "body is not JSON" };
  }
  const parsed = reportBodySchema.safeParse(json);
  if (!parsed.success) return { ok: false, status: 400, error: "invalid report body" };
  if (Math.abs(now - parsed.data.ts) > REPORT_MAX_AGE_MS) {
    return { ok: false, status: 401, error: "stale report" };
  }
  if (seen.has(expected)) return { ok: false, status: 409, error: "replayed report" };
  seen.add(expected);
  return { ok: true, body: parsed.data };
}
