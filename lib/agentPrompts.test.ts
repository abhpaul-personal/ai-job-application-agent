import { describe, expect, it } from "vitest";
import {
  buildAnalysisUserMessage,
  buildExtractUserMessage,
  buildKitUserMessage,
} from "./agentPrompts";
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
});
