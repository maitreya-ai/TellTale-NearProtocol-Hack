import { isScenarioId, parseModelChoice, runScenario } from "@telltale/agent";
import { consoleGate, json, ndjson } from "@/lib/server/http";
import { scenarioPorts, type ModelChoice } from "@/lib/server/runtime";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = consoleGate(request);
  if (blocked) return blocked;
  const { id } = await context.params;
  if (!isScenarioId(id)) return json({ error: "unknown_scenario" }, 404);
  const url = new URL(request.url);
  const model: ModelChoice = parseModelChoice(url.searchParams.get("model"));
  return ndjson((log) => runScenario(id, scenarioPorts(log, model)));
}
