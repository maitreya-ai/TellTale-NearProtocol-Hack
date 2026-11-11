import { failure, json } from "@/lib/server/http";
import { snapshot } from "@/lib/server/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await snapshot());
  } catch (error) {
    return failure(error);
  }
}
