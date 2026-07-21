import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  buildAnalysisUserMessage,
  buildExtractUserMessage,
  buildKitUserMessage,
  EXTRACT_SYSTEM_PROMPT,
  MAX_TOKENS,
} from "@/lib/agentPrompts";
import { runAgentStage, type CallModel } from "@/lib/agentStage";
import { compileSystemPrompt } from "@/lib/compilePrompt";
import { createRateLimiter } from "@/lib/rateLimit";
import {
  AgentRequestSchema,
  ApplicationKitSchema,
  FitAnalysisSchema,
  StoryBankSchema,
  type AgentRequest,
} from "@/lib/schema";

const MODEL = "claude-sonnet-4-6";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Stopgap abuse protection until real auth exists (Phase 3) — see
// docs/PRE-DEPLOYMENT-CHECKLIST.md item A1 and lib/rateLimit.ts for why this
// is deliberately simple rather than a durable/production limiter.
const rateLimiter = createRateLimiter(
  { limit: 10, windowMs: HOUR_MS }, // per IP
  { limit: 200, windowMs: DAY_MS }, // across all users
);

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

function runStage(input: AgentRequest, callModel: CallModel) {
  switch (input.stage) {
    case "analysis":
      return runAgentStage({
        callModel,
        system: compileSystemPrompt(input.profile),
        userMessage: buildAnalysisUserMessage(input.jd),
        schema: FitAnalysisSchema,
      });
    case "kit":
      return runAgentStage({
        callModel,
        system: compileSystemPrompt(input.profile),
        userMessage: buildKitUserMessage(input.jd, input.analysis, input.profile.formats),
        schema: ApplicationKitSchema,
      });
    case "extract":
      return runAgentStage({
        callModel,
        system: EXTRACT_SYSTEM_PROMPT,
        userMessage: buildExtractUserMessage(input.rawInput),
        schema: StoryBankSchema,
      });
  }
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  if (!rateLimiter.check(clientIp)) {
    console.warn(`Rate limit hit for ${clientIp}`);
    return NextResponse.json(
      { error: "This app is getting a lot of use right now — please try again later." },
      { status: 429 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = AgentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Request did not match the expected shape." },
      { status: 400 },
    );
  }

  const client = new Anthropic({ apiKey });
  const maxTokens = MAX_TOKENS[parsed.data.stage];

  const callModel: CallModel = async (system, messages) => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const block = response.content[0];
    return block?.type === "text" ? block.text : "";
  };

  try {
    const result = await runStage(parsed.data, callModel);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json({ data: result.data }, { status: 200 });
  } catch (err) {
    console.error("Anthropic API call failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The model provider request failed." }, { status: 502 });
  }
}
