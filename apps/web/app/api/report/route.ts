import { REPORT_SIGNATURE_HEADER, verifyReport } from "@telltale/core";
import { failure, json } from "@/lib/server/http";
import { reportTrip } from "@/lib/server/runtime";

// Signatures already accepted by this isolate; blocks straightforward replays.
const seen = new Set<string>();

export async function POST(request: Request) {
  const secret = process.env.REPORT_HMAC_SECRET;
  if (!secret) return json({ error: "not_configured", missing: ["REPORT_HMAC_SECRET"] }, 503);
  const raw = await request.text();
  const check = verifyReport(secret, raw, request.headers.get(REPORT_SIGNATURE_HEADER), seen);
  if (!check.ok) return json({ error: check.error }, check.status);
  try {
    const { txHash } = await reportTrip(check.body.kind, check.body.detail);
    return json({ tripped: true, txHash });
  } catch (error) {
    return failure(error);
  }
}
