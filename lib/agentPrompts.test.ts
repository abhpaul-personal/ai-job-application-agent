import { describe, expect, it } from "vitest";
import {
  buildAnalysisUserMessage,
  buildChatSystemPrompt,
  buildChatUserMessage,
  buildExtractUserMessage,
  buildKitUserMessage,
} from "./agentPrompts";
import { compileSystemPrompt } from "./compilePrompt";
import { defaultProfile } from "./loadProfile";
import type { FitAnalysis, Profile } from "./schema";

describe("buildAnalysisUserMessage", () => {
  it("includes the job description verbatim", () => {
    const jd = "Senior PM role at Acme Corp, remote.";
    expect(buildAnalysisUserMessage(jd)).toContain(jd);
  });
});

describe("buildKitUserMessage", () => {
  const analysis: FitAnalysis = {
    fitScore: 80,
    verdict: "Strong fit",
    matchedStrengths: [{ storyName: "Checkout Modernisation", whyItMatches: "Scale" }],
    gaps: ["No fintech experience"],
    salaryCheck: { meetsFloor: true, note: "Meets floor" },
    scamFlags: [],
  };

  const formats: Profile["formats"] = {
    coverLetter: "Compact India format, plain text.",
    recruiterDm: "Under 300 characters.",
  };

  it("includes the JD, the approved analysis, and the format instructions", () => {
    const jd = "Senior PM role at Acme Corp, remote.";
    const message = buildKitUserMessage(jd, analysis, formats);
    expect(message).toContain(jd);
    expect(message).toContain("Checkout Modernisation");
    expect(message).toContain("Strong fit");
    expect(message).toContain(formats.coverLetter);
    expect(message).toContain(formats.recruiterDm);
  });
});

describe("buildExtractUserMessage", () => {
  it("includes the raw input verbatim", () => {
    const rawInput = "Led a team of 5 engineers to ship a payments platform.";
    expect(buildExtractUserMessage(rawInput)).toContain(rawInput);
  });

  it("caps extraction at 8 items to avoid a truncated response on long input", () => {
    expect(buildExtractUserMessage("some CV text")).toContain("at most 8");
  });
});

describe("buildChatSystemPrompt", () => {
  it("includes the compiled profile and the hard boundary instructions", () => {
    const prompt = buildChatSystemPrompt(defaultProfile);
    expect(prompt).toContain(compileSystemPrompt(defaultProfile));
    expect(prompt).toContain("cannot trigger a fit analysis");
    expect(prompt).toContain("just apply for me");
    expect(prompt).toContain("concise");
  });
});

describe("buildChatUserMessage", () => {
  const analysis: FitAnalysis = {
    fitScore: 40,
    verdict: "Worth a second look",
    matchedStrengths: [],
    gaps: ["No direct fintech experience"],
    salaryCheck: { meetsFloor: false, note: "Below floor" },
    scamFlags: [],
  };

  it("includes the user's message", () => {
    const message = buildChatUserMessage("why did this score low");
    expect(message).toContain("why did this score low");
  });

  it("includes the analysis JSON when one is provided", () => {
    const message = buildChatUserMessage("why did this score low", analysis);
    expect(message).toContain("Worth a second look");
    expect(message).toContain("No direct fintech experience");
  });

  it("says plainly that no analysis exists yet when none is provided", () => {
    const message = buildChatUserMessage("what does my agent know about me");
    expect(message).toContain("No fit analysis has been run yet");
  });
});
