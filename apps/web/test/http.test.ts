import { afterEach, describe, expect, it } from "@jest/globals";
import { MissingEnvError } from "@telltale/core";
import { consoleGate, failure, ndjson } from "../lib/server/http";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("console gate", () => {
  it("is closed unless the demo or simulation is on", () => {
    delete process.env.TELLTALE_DEMO;
    delete process.env.TELLTALE_MOCK;
    expect(consoleGate(new Request("http://x/api"))?.status).toBe(403);
  });

  it("checks the token when one is set", () => {
    process.env.TELLTALE_DEMO = "1";
    process.env.DEMO_CONSOLE_TOKEN = "s3cret";
    expect(consoleGate(new Request("http://x/api"))?.status).toBe(401);
    expect(
      consoleGate(new Request("http://x/api", { headers: { "x-console-token": "s3cret" } })),
    ).toBeNull();
  });
});

describe("responses", () => {
  it("explains missing configuration instead of crashing", async () => {
    const res = failure(new MissingEnvError(["VAULT_ACCOUNT_ID"]));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      error: "not_configured",
      missing: ["VAULT_ACCOUNT_ID"],
    });
  });

  it("streams log lines as NDJSON and ends with __done__", async () => {
    const res = ndjson(async (log) => {
      log({ actor: "vault", level: "alarm", msg: "TRIPPED" });
      return { tripped: true };
    });
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    const lines = (await res.text())
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines.map((l) => l.msg)).toEqual(["TRIPPED", "__done__"]);
    expect(lines[1].data).toEqual({ tripped: true });
  });
});
