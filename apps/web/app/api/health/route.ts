import { json } from "@/lib/server/http";
import { isSimulation } from "@/lib/server/runtime";

export const dynamic = "force-dynamic";

export function GET() {
  return json({
    ok: true,
    mode: isSimulation() ? "simulation" : "live",
    vault: process.env.VAULT_ACCOUNT_ID ?? null,
    console: process.env.TELLTALE_DEMO === "1" || isSimulation(),
    consoleToken: Boolean(process.env.DEMO_CONSOLE_TOKEN),
    nearAi: Boolean(process.env.NEAR_AI_API_KEY),
  });
}
