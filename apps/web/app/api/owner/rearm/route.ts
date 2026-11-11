import { consoleGate, failure, json } from "@/lib/server/http";
import { rearm } from "@/lib/server/runtime";

export async function POST(request: Request) {
  const blocked = consoleGate(request);
  if (blocked) return blocked;
  try {
    return json(await rearm());
  } catch (error) {
    return failure(error);
  }
}
