/**
 * Runs a demo scenario against the deployed vault and prints the log.
 *   bun scripts/run-scenario.ts honest|stolen-env|poisoned-invoice [--model llm]
 */
import { isScenarioId, livePorts, parseModelChoice, pickModel, runScenario } from "@telltale/agent";
import { option, printEvent } from "./lib/cli";

const id = process.argv[2] ?? "";
if (!isScenarioId(id)) {
  console.error(
    "usage: bun scripts/run-scenario.ts honest|stolen-env|poisoned-invoice [--model llm]",
  );
  process.exit(1);
}
const model = pickModel(parseModelChoice(option("--model")));
const result = await runScenario(
  id,
  livePorts((event) => printEvent(event), model),
);
console.log(JSON.stringify(result));
