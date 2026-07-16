import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { runAgentStage, stripJsonFences, type CallModel } from "./agentStage";

const TestSchema = z.object({ value: z.number().int().min(0).max(10) });

describe("stripJsonFences", () => {
  it("strips a ```json ... ``` fence", () => {
    expect(stripJsonFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("strips a bare ``` ... ``` fence", () => {
    expect(stripJsonFences('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("leaves unfenced text untouched (besides trimming)", () => {
    expect(stripJsonFences('  {"a":1}  ')).toBe('{"a":1}');
  });
});

describe("runAgentStage", () => {
  it("succeeds on the first valid response without retrying", async () => {
    const callModel: CallModel = vi.fn(async () => JSON.stringify({ value: 5 }));
    const result = await runAgentStage({
      callModel,
      system: "sys",
      userMessage: "go",
      schema: TestSchema,
    });
    expect(result).toEqual({ success: true, data: { value: 5 } });
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("retries once on invalid JSON and succeeds if the retry is valid", async () => {
    const callModel: CallModel = vi
      .fn()
      .mockResolvedValueOnce("not json at all")
      .mockResolvedValueOnce(JSON.stringify({ value: 7 }));
    const result = await runAgentStage({
      callModel,
      system: "sys",
      userMessage: "go",
      schema: TestSchema,
    });
    expect(result).toEqual({ success: true, data: { value: 7 } });
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it("retries once on schema-invalid JSON and succeeds if the retry is valid", async () => {
    const callModel: CallModel = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify({ value: 999 }))
      .mockResolvedValueOnce(JSON.stringify({ value: 3 }));
    const result = await runAgentStage({
      callModel,
      system: "sys",
      userMessage: "go",
      schema: TestSchema,
    });
    expect(result).toEqual({ success: true, data: { value: 3 } });
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it("returns a typed failure after exactly one retry if still invalid", async () => {
    const callModel: CallModel = vi.fn(async () => "still not json");
    const result = await runAgentStage({
      callModel,
      system: "sys",
      userMessage: "go",
      schema: TestSchema,
    });
    expect(result.success).toBe(false);
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it("sends a repair instruction as the retry's follow-up message", async () => {
    const callModel: CallModel = vi
      .fn()
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce(JSON.stringify({ value: 1 }));
    await runAgentStage({ callModel, system: "sys", userMessage: "go", schema: TestSchema });
    const secondCallMessages = (callModel as ReturnType<typeof vi.fn>).mock.calls[1][1];
    expect(secondCallMessages).toHaveLength(3);
    expect(secondCallMessages[0]).toEqual({ role: "user", content: "go" });
    expect(secondCallMessages[1]).toEqual({ role: "assistant", content: "not json" });
    expect(secondCallMessages[2].role).toBe("user");
    expect(secondCallMessages[2].content).toContain("did not match the required format");
  });
});
