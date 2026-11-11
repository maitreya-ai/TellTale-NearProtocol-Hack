import { describe, expect, it } from "@jest/globals";
import { signReport, verifyReport } from "../src/report-auth";

const secret = "11".repeat(32);
const now = 1_763_000_000_000;
const body = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ kind: "decoy_tool", detail: "raise_spending_limit({})", ts: now, ...over });

describe("reporter auth", () => {
  it("accepts a fresh, correctly signed report once", () => {
    const raw = body();
    const seen = new Set<string>();
    const first = verifyReport(secret, raw, signReport(secret, raw), seen, now);
    expect(first).toEqual({ ok: true, body: JSON.parse(raw) });
    const replay = verifyReport(secret, raw, signReport(secret, raw), seen, now);
    expect(replay).toMatchObject({ ok: false, status: 409 });
  });

  it("rejects a missing or wrong signature", () => {
    const raw = body();
    expect(verifyReport(secret, raw, null, new Set(), now)).toMatchObject({
      ok: false,
      status: 401,
    });
    expect(
      verifyReport(secret, raw, signReport("22".repeat(32), raw), new Set(), now),
    ).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("rejects stale reports", () => {
    const raw = body({ ts: now - 61_000 });
    expect(verifyReport(secret, raw, signReport(secret, raw), new Set(), now)).toMatchObject({
      ok: false,
      error: "stale report",
    });
  });

  it("rejects bodies that fail the schema", () => {
    const raw = body({ kind: "free_money" });
    expect(verifyReport(secret, raw, signReport(secret, raw), new Set(), now)).toMatchObject({
      ok: false,
      status: 400,
    });
  });
});
