import type { StoryBankItem } from "./schema";

// Stub for the M4 API call that will send `rawInput` (pasted CV text, or the
// concatenated guided-prompt answers) to the model and parse a real story
// bank back. For now it ignores the input and returns fixed placeholder
// stories so the Experience step has something concrete to review.
export function stubExtractStoryBank(rawInput: string): StoryBankItem[] {
  void rawInput;
  return [
    {
      name: "Placeholder Story One",
      one_liner: "Replace this with a real story once the AI extraction call is wired up in M4.",
      metrics: "TBD",
      themes: ["placeholder"],
    },
    {
      name: "Placeholder Story Two",
      one_liner: "This is a stand-in story bank item, not generated from your input yet.",
      metrics: "TBD",
      themes: ["placeholder"],
    },
  ];
}
