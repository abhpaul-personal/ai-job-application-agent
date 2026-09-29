import { describe, expect, it } from "vitest";
import {
  buildAnalysisUserMessage,
  buildChatSystemPrompt,
  buildChatUserMessage,
  buildExtractUserMessage,
  buildKitUserMessage,
  buildProfileExtractUserMessage,
  buildTrackerExtractUserMessage,
  PROFILE_EXTRACT_SYSTEM_PROMPT,
} from "./agentPrompts";
import { compileSystemPrompt } from "./compilePrompt";
import { defaultProfile } from "./loadProfile";
import type { FitAnalysis, Profile, TrackerRecord } from "./schema";

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

  it("asks for recruiterEmail as an outreach email, not a character-capped DM", () => {
    const message = buildKitUserMessage("Senior PM role at Acme Corp.", analysis, formats);
    expect(message).toContain("recruiterEmail");
    expect(message).toContain("outreach email");
    expect(message).not.toContain("under 300 characters");
  });

  it("asks for the new structured cv shape, not a flat headline + bullets", () => {
    const message = buildKitUserMessage("Senior PM role at Acme Corp.", analysis, formats);
    expect(message).toContain("header");
    expect(message).toContain("coreCompetencies");
    expect(message).toContain("experience");
    expect(message).not.toContain("cvHeadline");
    expect(message).not.toContain("cvBullets");
  });

  it("includes explicit anti-fabrication instructions for the cv sections", () => {
    const message = buildKitUserMessage("Senior PM role at Acme Corp.", analysis, formats);
    expect(message).toContain("never invent");
    expect(message).toContain("selection");
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

  it("includes the tracker-action capability and its own hard limits", () => {
    const prompt = buildChatSystemPrompt(defaultProfile);
    expect(prompt).toContain("trackerDraft");
    expect(prompt).toContain("never write a tracker record yourself");
    expect(prompt).toContain("do not guess which one");
    expect(prompt).toContain("which one they mean");
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

  it("says the tracker has no records yet when none are given", () => {
    const message = buildChatUserMessage("add Agoda TPM, applied yesterday");
    expect(message).toContain("no records yet");
  });

  it("lists each tracker record's id, company, role, and status for matching", () => {
    const trackerRecords: TrackerRecord[] = [
      {
        id: "record-1",
        role: "TPM",
        company: "Agoda",
        track: "TPM",
        compBand: "",
        source: "",
        appliedDate: "2026-07-01",
        lastUpdatedDate: "2026-07-01",
        status: "Applied",
        nextAction: "",
        entryOrigin: "Manual",
      },
    ];
    const message = buildChatUserMessage(
      "mark the Agoda one as Interview",
      undefined,
      trackerRecords,
    );
    expect(message).toContain("record-1");
    expect(message).toContain("Agoda");
    expect(message).toContain("TPM");
    expect(message).toContain("Applied");
  });

  it("includes today's date so relative dates can be resolved", () => {
    const message = buildChatUserMessage("add Agoda TPM, applied yesterday", undefined, [], "2026-07-15");
    expect(message).toContain("2026-07-15");
  });
});

describe("buildTrackerExtractUserMessage", () => {
  it("includes the raw input verbatim and today's date", () => {
    const rawInput = "Got an email from Agoda recruiter about the TPM role, applied yesterday.";
    const message = buildTrackerExtractUserMessage(rawInput, "2026-07-15");
    expect(message).toContain(rawInput);
    expect(message).toContain("2026-07-15");
  });
});

describe("buildProfileExtractUserMessage", () => {
  it("includes the raw resume text verbatim", () => {
    const rawInput = "Rohan Mehta — Senior Product Manager at DemoCommerce Labs.";
    expect(buildProfileExtractUserMessage(rawInput)).toContain(rawInput);
  });

  it("caps story-bank extraction at 8 items, same as the CV-paste flow", () => {
    expect(buildProfileExtractUserMessage("some resume text")).toContain("at most 8");
  });
});

describe("PROFILE_EXTRACT_SYSTEM_PROMPT", () => {
  it("says never to invent compensation figures", () => {
    expect(PROFILE_EXTRACT_SYSTEM_PROMPT).toContain("never invent metrics, titles, dates, or compensation figures");
  });

  it("calls out that resumes almost never state compensation", () => {
    expect(PROFILE_EXTRACT_SYSTEM_PROMPT).toContain("almost never appear on a resume");
  });
});
