import { describe, expect, it } from "vitest";
import { classifyFitTone } from "./fitTone";
import type { FitAnalysis } from "./schema";

function fitAnalysis(overrides: Partial<FitAnalysis>): FitAnalysis {
  return {
    fitScore: 50,
    verdict: "",
    matchedStrengths: [],
    gaps: [],
    salaryCheck: { meetsFloor: true, note: "" },
    scamFlags: [],
    ...overrides,
  };
}

describe("classifyFitTone", () => {
  it("classifies a plainly-stated strong fit as strong", () => {
    expect(
      classifyFitTone(fitAnalysis({ fitScore: 95, verdict: "Strong fit — go for it!" })),
    ).toBe("strong");
  });

  it("classifies a borderline/stretch verdict as stretch", () => {
    expect(
      classifyFitTone(fitAnalysis({ fitScore: 65, verdict: "Worth pursuing with prep." })),
    ).toBe("stretch");
  });

  it("classifies a supportively-phrased low fit as low", () => {
    expect(
      classifyFitTone(
        fitAnalysis({ fitScore: 20, verdict: "Not the right fit right now" }),
      ),
    ).toBe("low");
    expect(
      classifyFitTone(
        fitAnalysis({ fitScore: 25, verdict: "Save your energy for stronger matches" }),
      ),
    ).toBe("low");
  });

  it("classifies an unrecognised verdict phrase by falling back to fitScore", () => {
    expect(classifyFitTone(fitAnalysis({ fitScore: 40, verdict: "Worth a second look" }))).toBe(
      "low",
    );
    expect(classifyFitTone(fitAnalysis({ fitScore: 60, verdict: "Something in between" }))).toBe(
      "stretch",
    );
  });
});
