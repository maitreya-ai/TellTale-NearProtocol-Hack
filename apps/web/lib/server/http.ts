import { errorText, type Log } from "@telltale/agent";
import { MissingEnvError } from "@telltale/core";

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function failure(error: unknown): Response {
  if (error instanceof MissingEnvError) {
    return json(
      {
        error: "not_configured",
        missing: error.missing,
        hint: "Run `bun run setup:testnet` or set TELLTALE_MOCK=1.",
      },
      503,
    );
  }
  return json({ error: errorText(error) }, 502);
}

/** Streams log lines as NDJSON while `run` executes. The last line has msg "__done__". */
export function ndjson(run: (log: Log) => Promise<unknown>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (line: object) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
      const log: Log = (event) => write({ t: Date.now(), ...event });
      try {
        const result = await run(log);
        write({ t: Date.now(), actor: "system", level: "info", msg: "__done__", data: result });
      } catch (error) {
        log({ actor: "system", level: "warn", msg: `Scenario stopped: ${errorText(error)}` });
        write({ t: Date.now(), actor: "system", level: "info", msg: "__done__", data: null });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * The red-team console can trip and re-arm the vault, so it's only on when
 * TELLTALE_DEMO=1, and needs DEMO_CONSOLE_TOKEN when one is set.
 */
export function consoleGate(request: Request): Response | null {
  if (process.env.TELLTALE_DEMO !== "1" && process.env.TELLTALE_MOCK !== "1") {
    return json(
      { error: "console_disabled", hint: "Set TELLTALE_DEMO=1 to enable the red-team console." },
      403,
    );
  }
  const token = process.env.DEMO_CONSOLE_TOKEN;
  if (token && request.headers.get("x-console-token") !== token) {
    return json({ error: "bad_console_token" }, 401);
  }
  return null;
}
