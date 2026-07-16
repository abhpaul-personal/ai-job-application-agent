import type { z } from "zod";

export type ModelMessage = { role: "user" | "assistant"; content: string };
export type CallModel = (system: string, messages: ModelMessage[]) => Promise<string>;

export type StageResult<T> = { success: true; data: T } | { success: false; error: string };

export function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function tryParse<T>(raw: string, schema: z.ZodType<T>): StageResult<T> {
  let json: unknown;
  try {
    json = JSON.parse(stripJsonFences(raw));
  } catch {
    return { success: false, error: "invalid JSON" };
  }
  const result = schema.safeParse(json);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Never include issue.message here: it can echo back the model's actual
  // (possibly user-derived) invalid value. Path+code only.
  const issues = result.error.issues
    .map((issue) => `${issue.path.join(".")} (${issue.code})`)
    .join(", ");
  return { success: false, error: `schema validation failed: ${issues}` };
}

function buildRepairInstruction(error: string): string {
  return `Your previous response did not match the required format (${error}). Respond again with ONLY a single valid JSON value matching the requested shape — no prose, no markdown fences.`;
}

// Calls the model, validates the JSON response against `schema`, and — on
// invalid JSON or a failed schema parse — retries exactly once with a repair
// instruction appended to the conversation. `callModel` is injected so this
// retry/validate logic is unit-testable without hitting the network.
export async function runAgentStage<T>({
  callModel,
  system,
  userMessage,
  schema,
}: {
  callModel: CallModel;
  system: string;
  userMessage: string;
  schema: z.ZodType<T>;
}): Promise<StageResult<T>> {
  const messages: ModelMessage[] = [{ role: "user", content: userMessage }];

  const firstResponse = await callModel(system, messages);
  const firstResult = tryParse(firstResponse, schema);
  if (firstResult.success) return firstResult;

  messages.push({ role: "assistant", content: firstResponse });
  messages.push({ role: "user", content: buildRepairInstruction(firstResult.error) });

  const secondResponse = await callModel(system, messages);
  const secondResult = tryParse(secondResponse, schema);
  if (secondResult.success) return secondResult;

  return {
    success: false,
    error: `Model did not return valid JSON matching the schema after one retry: ${secondResult.error}`,
  };
}
