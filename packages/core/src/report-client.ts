import { REPORT_SIGNATURE_HEADER, signReport, type ReportBody } from "./report-auth";

/** Sends an HMAC-signed report to the Telltale reporter endpoint. */
export async function sendReport(
  url: string,
  secretHex: string,
  report: Omit<ReportBody, "ts">,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const raw = JSON.stringify({ ...report, ts: Date.now() });
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [REPORT_SIGNATURE_HEADER]: signReport(secretHex, raw),
    },
    body: raw,
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}
