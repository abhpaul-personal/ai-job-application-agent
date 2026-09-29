import type { FitAnalysis } from "./schema";

export type FitTone = "strong" | "stretch" | "low";

// verdict is free text (see lib/agentPrompts.ts's TONE_INSTRUCTION) — there's
// no fixed enum of categories, only three qualitative bands the model is
// asked to write toward: a plainly-stated strong fit, a "worth pursuing with
// prep" stretch fit, and a supportively-phrased low fit ("save your energy",
// "not the right fit right now"). This classifies by matching those bands'
// characteristic language rather than inventing a new fitScore threshold.
// fitScore only breaks a tie when the verdict text doesn't match any of
// them, and only as far as the one threshold (50) already used elsewhere in
// this app (app/(app)/agent/page.tsx's hasWarnings) — never above it.
export function classifyFitTone(analysis: FitAnalysis): FitTone {
  const verdict = analysis.verdict.toLowerCase();

  if (
    /not the right fit|save your energy|worth a second look|pass on this|reconsider/.test(
      verdict,
    )
  ) {
    return "low";
  }

  if (/strong fit|go for it|excellent fit|great fit/.test(verdict)) {
    return "strong";
  }

  if (/with prep|worth pursuing|stretch/.test(verdict)) {
    return "stretch";
  }

  return analysis.fitScore < 50 ? "low" : "stretch";
}

export const FIT_TONE_TEXT_CLASS: Record<FitTone, string> = {
  strong: "text-fit-strong",
  stretch: "text-fit-stretch",
  low: "text-fit-low",
};
