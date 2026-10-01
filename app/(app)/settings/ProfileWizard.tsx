"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { useProfileStatus } from "@/components/ProfileStatusContext";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
} from "@/components/uiClasses";
import { compileSystemPrompt } from "@/lib/compilePrompt";
import {
  emptyDraft,
  extractImportableFields,
  mergeProfileDraft,
  type BasicsDraft,
  type ImportedProfileFields,
  type ProfileDraft,
  type TargetsDraft,
} from "@/lib/draftProfile";
import {
  WorkModeSchema,
  type Profile,
  type ProfileExtract,
  type StoryBankItem,
  type WorkHistoryEntry,
} from "@/lib/schema";

const STEPS = ["Basics", "Targets", "Experience", "Career History", "Rules", "Review"] as const;
const WIZARD_IN_PROGRESS_KEY = "aka.wizardInProgress";

const IMPORT_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  currentTitle: "Current title",
  currentCompany: "Current company",
  location: "Location",
  noticePeriodDays: "Notice period",
  currentCtcLpa: "Current CTC",
  expectedCtcMinLpa: "Expected CTC min",
  expectedCtcMaxLpa: "Expected CTC max",
  relocation: "Relocation",
  roleTypes: "Role types",
  seniority: "Seniority band",
  industries: "Industries",
  workMode: "Work mode",
  experienceFraming: "Experience framing",
};

// Turns the raw skip counts into one plain-language sentence, so an import
// with a bad field (or an unrelated file) says something instead of just
// going quiet — the wizard fields being pre-filled (or not) is otherwise the
// only feedback the user gets.
function describeImport(result: ImportedProfileFields): { tone: "success" | "info" | "none"; text: string } {
  const importedFieldCount =
    Object.keys(result.basics).length + Object.keys(result.targets).length;
  const importedAnything =
    importedFieldCount > 0 || result.storyBank.length > 0 || result.rules.length > 0;
  const skippedLabels = [...result.skipped.basics, ...result.skipped.targets].map(
    (key) => IMPORT_FIELD_LABELS[key] ?? key,
  );

  if (!importedAnything && skippedLabels.length === 0) {
    return {
      tone: "none",
      text: "That file doesn't look like a profile export — no problem, just fill in the form below.",
    };
  }

  const notes: string[] = [];
  if (skippedLabels.length > 0) {
    notes.push(
      `${skippedLabels.join(", ")} couldn't be read — fill ${skippedLabels.length === 1 ? "that" : "those"} in yourself`,
    );
  }
  if (result.skipped.storyBankItems > 0) {
    notes.push(
      `${result.skipped.storyBankItems} story-bank ${result.skipped.storyBankItems === 1 ? "entry" : "entries"} couldn't be read`,
    );
  }
  if (result.skipped.rulesEntries > 0) {
    notes.push(
      `${result.skipped.rulesEntries} rule${result.skipped.rulesEntries === 1 ? "" : "s"} couldn't be read`,
    );
  }

  if (notes.length === 0) {
    return { tone: "success", text: "Imported cleanly — review each step below before saving." };
  }
  return { tone: "info", text: `Imported what we could. ${notes.join("; ")}.` };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function BasicsStep({
  draft,
  defaults,
  onChange,
}: {
  draft: ProfileDraft["basics"];
  defaults: Profile["basics"];
  onChange: (patch: Partial<Profile["basics"]>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Name">
        <input
          type="text"
          className={inputClass}
          value={draft.name ?? ""}
          placeholder={defaults.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          className={inputClass}
          value={draft.email ?? ""}
          placeholder={defaults.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </Field>
      <Field label="Current title">
        <input
          type="text"
          className={inputClass}
          value={draft.currentTitle ?? ""}
          placeholder={defaults.currentTitle}
          onChange={(e) => onChange({ currentTitle: e.target.value })}
        />
      </Field>
      <Field label="Current company">
        <input
          type="text"
          className={inputClass}
          value={draft.currentCompany ?? ""}
          placeholder={defaults.currentCompany}
          onChange={(e) => onChange({ currentCompany: e.target.value })}
        />
      </Field>
      <Field label="Location">
        <input
          type="text"
          className={inputClass}
          value={draft.location ?? ""}
          placeholder={defaults.location}
          onChange={(e) => onChange({ location: e.target.value })}
        />
      </Field>
      <Field label="Notice period (days)">
        <input
          type="number"
          className={inputClass}
          value={draft.noticePeriodDays ?? ""}
          placeholder={String(defaults.noticePeriodDays)}
          onChange={(e) =>
            onChange({
              noticePeriodDays: e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
        />
      </Field>
      <Field label="Current CTC (LPA)">
        <input
          type="number"
          className={inputClass}
          value={draft.currentCtcLpa ?? ""}
          placeholder={String(defaults.currentCtcLpa)}
          onChange={(e) =>
            onChange({
              currentCtcLpa: e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Expected CTC min (LPA)">
          <input
            type="number"
            className={inputClass}
            value={draft.expectedCtcMinLpa ?? ""}
            placeholder={String(defaults.expectedCtcMinLpa)}
            onChange={(e) =>
              onChange({
                expectedCtcMinLpa: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </Field>
        <Field label="Expected CTC max (LPA)">
          <input
            type="number"
            className={inputClass}
            value={draft.expectedCtcMaxLpa ?? ""}
            placeholder={String(defaults.expectedCtcMaxLpa)}
            onChange={(e) =>
              onChange({
                expectedCtcMaxLpa: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </Field>
      </div>
      <p className="text-xs text-text-secondary">
        Expected CTC min becomes the agent&apos;s salary floor.
      </p>
      <Field label="Relocation">
        <input
          type="text"
          className={inputClass}
          value={draft.relocation ?? ""}
          placeholder={defaults.relocation}
          onChange={(e) => onChange({ relocation: e.target.value })}
        />
      </Field>
      <p className="text-xs text-text-secondary">
        The fields below appear in the CV header the kit generates — optional, but worth
        filling in.
      </p>
      <Field label="Phone">
        <input
          type="text"
          className={inputClass}
          value={draft.phone ?? ""}
          placeholder={defaults.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </Field>
      <Field label="LinkedIn URL">
        <input
          type="text"
          className={inputClass}
          value={draft.linkedinUrl ?? ""}
          placeholder={defaults.linkedinUrl}
          onChange={(e) => onChange({ linkedinUrl: e.target.value })}
        />
      </Field>
      <Field label="Portfolio URL">
        <input
          type="text"
          className={inputClass}
          value={draft.portfolioUrl ?? ""}
          placeholder={defaults.portfolioUrl}
          onChange={(e) => onChange({ portfolioUrl: e.target.value })}
        />
      </Field>
    </div>
  );
}

function TargetsStep({
  draft,
  defaults,
  onChange,
  roleTypesText,
  setRoleTypesText,
  industriesText,
  setIndustriesText,
}: {
  draft: ProfileDraft["targets"];
  defaults: Profile["targets"];
  onChange: (patch: Partial<Profile["targets"]>) => void;
  roleTypesText: string;
  setRoleTypesText: (value: string) => void;
  industriesText: string;
  setIndustriesText: (value: string) => void;
}) {
  const workModes = draft.workMode ?? [];

  function toggleWorkMode(mode: (typeof WorkModeSchema.options)[number]) {
    const next = workModes.includes(mode)
      ? workModes.filter((m) => m !== mode)
      : [...workModes, mode];
    onChange({ workMode: next });
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label={`Role types (comma-separated, e.g. "${defaults.roleTypes.join(", ")}")`}>
        <input
          type="text"
          className={inputClass}
          value={roleTypesText}
          placeholder={defaults.roleTypes.join(", ")}
          onChange={(e) => setRoleTypesText(e.target.value)}
          onBlur={() =>
            onChange({
              roleTypes: roleTypesText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </Field>
      <Field label="Seniority band">
        <input
          type="text"
          className={inputClass}
          value={draft.seniority ?? ""}
          placeholder={defaults.seniority}
          onChange={(e) => onChange({ seniority: e.target.value })}
        />
      </Field>
      <Field label={`Industries (comma-separated, e.g. "${defaults.industries.join(", ")}")`}>
        <input
          type="text"
          className={inputClass}
          value={industriesText}
          placeholder={defaults.industries.join(", ")}
          onChange={(e) => setIndustriesText(e.target.value)}
          onBlur={() =>
            onChange({
              industries: industriesText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Work mode</span>
        <div className="flex flex-wrap gap-4">
          {WorkModeSchema.options.map((mode) => (
            <label key={mode} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={workModes.includes(mode)}
                onChange={() => toggleWorkMode(mode)}
              />
              {mode}
            </label>
          ))}
        </div>
      </div>
      <Field label="Experience framing">
        <input
          type="text"
          className={inputClass}
          value={draft.experienceFraming ?? ""}
          placeholder={defaults.experienceFraming}
          onChange={(e) => onChange({ experienceFraming: e.target.value })}
        />
      </Field>
    </div>
  );
}

function ExperienceStep({
  storyBank,
  onGenerate,
  isEditing,
}: {
  storyBank: Profile["storyBank"];
  onGenerate: (stories: StoryBankItem[]) => void;
  isEditing: boolean;
}) {
  const [mode, setMode] = useState<"paste" | "guided">("paste");
  const [cvText, setCvText] = useState("");
  const [guided, setGuided] = useState({ q1: "", q2: "", q3: "", q4: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGenerate() {
    const rawInput = mode === "paste" ? cvText : Object.values(guided).join("\n");
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "extract", rawInput }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(body.error ?? "Something went wrong.");
        return;
      }
      onGenerate(body.data as StoryBankItem[]);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Could not reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          className={mode === "paste" ? primaryButtonClass : secondaryButtonClass}
          onClick={() => setMode("paste")}
        >
          Paste CV
        </button>
        <button
          type="button"
          className={mode === "guided" ? primaryButtonClass : secondaryButtonClass}
          onClick={() => setMode("guided")}
        >
          Guided prompts
        </button>
      </div>

      {mode === "paste" ? (
        <Field label="Paste your base CV as text">
          <textarea
            className={textareaClass}
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
          />
        </Field>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Your strongest 0-to-1 story?">
            <textarea
              className={textareaClass}
              value={guided.q1}
              onChange={(e) => setGuided((g) => ({ ...g, q1: e.target.value }))}
            />
          </Field>
          <Field label="A program you ran at scale?">
            <textarea
              className={textareaClass}
              value={guided.q2}
              onChange={(e) => setGuided((g) => ({ ...g, q2: e.target.value }))}
            />
          </Field>
          <Field label="A compliance/quality win?">
            <textarea
              className={textareaClass}
              value={guided.q3}
              onChange={(e) => setGuided((g) => ({ ...g, q3: e.target.value }))}
            />
          </Field>
          <Field label="Your biggest cross-functional delivery?">
            <textarea
              className={textareaClass}
              value={guided.q4}
              onChange={(e) => setGuided((g) => ({ ...g, q4: e.target.value }))}
            />
          </Field>
        </div>
      )}

      <button
        type="button"
        className={secondaryButtonClass}
        disabled={status === "loading"}
        onClick={handleGenerate}
      >
        {status === "loading" ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Spinner /> Generating…
          </span>
        ) : (
          "Generate story bank"
        )}
      </button>
      <p className="text-xs text-text-secondary">
        Uses what you wrote above to draft a story bank
        {isEditing ? "." : " — review and edit it later from Settings."}
      </p>
      {status === "error" && <p className="text-sm text-fit-low">{errorMessage}</p>}

      {storyBank.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-foreground/10 p-3">
          <span className={labelClass}>Generated story bank</span>
          {storyBank.map((story) => (
            <div key={story.name} className="text-sm">
              <span className="font-medium">{story.name}</span> — {story.one_liner}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkHistoryEditor({
  entries,
  onChange,
}: {
  entries: WorkHistoryEntry[];
  onChange: (entries: WorkHistoryEntry[]) => void;
}) {
  function updateEntry(index: number, patch: Partial<WorkHistoryEntry>) {
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function addEntry() {
    onChange([
      ...entries,
      { role: "", company: "", location: "", startDate: "", endDate: "", bullets: [] },
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-foreground/10 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <input
                type="text"
                className={inputClass}
                value={entry.role}
                onChange={(e) => updateEntry(i, { role: e.target.value })}
              />
            </Field>
            <Field label="Company">
              <input
                type="text"
                className={inputClass}
                value={entry.company}
                onChange={(e) => updateEntry(i, { company: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Location">
              <input
                type="text"
                className={inputClass}
                value={entry.location}
                onChange={(e) => updateEntry(i, { location: e.target.value })}
              />
            </Field>
            <Field label="Start date">
              <input
                type="text"
                className={inputClass}
                placeholder="Sep 2024"
                value={entry.startDate}
                onChange={(e) => updateEntry(i, { startDate: e.target.value })}
              />
            </Field>
            <Field label="End date">
              <input
                type="text"
                className={inputClass}
                placeholder="Present"
                value={entry.endDate}
                onChange={(e) => updateEntry(i, { endDate: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Bullets (one per line)">
            <textarea
              className={textareaClass}
              value={entry.bullets.join("\n")}
              onChange={(e) => updateEntry(i, { bullets: e.target.value.split("\n") })}
            />
          </Field>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => removeEntry(i)}
          >
            Remove this role
          </button>
        </div>
      ))}
      <button type="button" className={secondaryButtonClass} onClick={addEntry}>
        Add another role
      </button>
    </div>
  );
}

function CareerHistoryStep({
  workHistory,
  onWorkHistoryChange,
  educationText,
  onEducationChange,
  certificationsText,
  onCertificationsChange,
  skillsText,
  onSkillsChange,
  isEditing,
}: {
  workHistory: WorkHistoryEntry[];
  onWorkHistoryChange: (entries: WorkHistoryEntry[]) => void;
  educationText: string;
  onEducationChange: (value: string) => void;
  certificationsText: string;
  onCertificationsChange: (value: string) => void;
  skillsText: string;
  onSkillsChange: (value: string) => void;
  isEditing: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Work history</span>
        <p className="text-xs text-text-secondary">
          Dated roles the CV generator draws from — real employers and dates only, tailoring
          means selecting/reordering these, never inventing new ones.
        </p>
        <WorkHistoryEditor entries={workHistory} onChange={onWorkHistoryChange} />
      </div>

      <div className="flex flex-col gap-2">
        <Field label="Education (one per line)">
          <textarea
            className={textareaClass}
            value={educationText}
            onChange={(e) => onEducationChange(e.target.value)}
            placeholder="MBA, Project Management — Sikkim Manipal University — 2012"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <Field label="Certifications (one per line)">
          <textarea
            className={textareaClass}
            value={certificationsText}
            onChange={(e) => onCertificationsChange(e.target.value)}
            placeholder="A-CSPO — Scrum Alliance — 2021"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <Field label="Technical skills (one per line)">
          <textarea
            className={textareaClass}
            value={skillsText}
            onChange={(e) => onSkillsChange(e.target.value)}
            placeholder="Platform and API: REST APIs, Idempotency, Circuit Breaker"
          />
        </Field>
        <p className="text-xs text-text-secondary">
          {isEditing
            ? "Prefilled from your current profile — edit or remove any line."
            : "Optional — a resume upload or JSON import can fill these in for you."}
        </p>
      </div>
    </div>
  );
}

function RulesStep({
  rulesText,
  onChange,
  isEditing,
}: {
  rulesText: string;
  onChange: (value: string) => void;
  isEditing: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Field label="Hard constraints (one per line)">
        <textarea
          className={`${textareaClass} min-h-48`}
          value={rulesText}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
      <p className="text-xs text-text-secondary">
        {isEditing
          ? "Prefilled from your current profile — edit or remove any line."
          : "Prefilled from the default profile — edit or remove any line."}
      </p>
    </div>
  );
}

function ReviewStep({ profile }: { profile: Profile }) {
  const prompt = useMemo(() => compileSystemPrompt(profile), [profile]);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-accent-warm">
        Your agent only draws from what you tell it here — nothing invented.
      </p>
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Profile JSON</span>
        <pre className="max-h-64 overflow-auto rounded-2xl border border-foreground/10 p-3 text-xs">
          {JSON.stringify(profile, null, 2)}
        </pre>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Compiled system prompt</span>
        <pre className="max-h-64 overflow-auto rounded-2xl border border-foreground/10 p-3 text-xs">
          {prompt}
        </pre>
      </div>
    </div>
  );
}

export function ProfileWizard({
  defaultProfile,
  initialProfile,
  onSaved,
}: {
  defaultProfile: Profile;
  initialProfile?: Profile;
  onSaved?: (profile: Profile) => void;
}) {
  const router = useRouter();
  const { refresh, saveProfile } = useProfileStatus();
  const isEditing = !!initialProfile;
  const [stepIndex, setStepIndex] = useState(0);
  const [showRestartNotice, setShowRestartNotice] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    tone: "success" | "info" | "none" | "error";
    text: string;
  } | null>(null);
  const [resumeStatus, setResumeStatus] = useState<"idle" | "loading">("idle");
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    initialProfile
      ? {
          basics: initialProfile.basics,
          targets: initialProfile.targets,
          storyBank: initialProfile.storyBank,
          rules: [...initialProfile.rules],
          workHistory: initialProfile.workHistory,
          education: initialProfile.education,
          certifications: initialProfile.certifications,
          skills: initialProfile.skills,
        }
      : emptyDraft(defaultProfile),
  );
  const [rulesText, setRulesText] = useState(() =>
    (initialProfile ?? defaultProfile).rules.join("\n"),
  );
  // Unlike rulesText (deliberately pre-filled from defaults for a new
  // profile), these start blank for a fresh wizard — same "skippable,
  // inherits nothing" convention as storyBank/workHistory.
  const [educationText, setEducationText] = useState(() =>
    (initialProfile?.education ?? []).join("\n"),
  );
  const [certificationsText, setCertificationsText] = useState(() =>
    (initialProfile?.certifications ?? []).join("\n"),
  );
  const [skillsText, setSkillsText] = useState(() =>
    (initialProfile?.skills ?? []).join("\n"),
  );
  const [roleTypesText, setRoleTypesText] = useState(() =>
    (initialProfile?.targets.roleTypes ?? []).join(", "),
  );
  const [industriesText, setIndustriesText] = useState(() =>
    (initialProfile?.targets.industries ?? []).join(", "),
  );
  // Guards the mount effect below against React Strict Mode's dev-only
  // double-invocation: the effect reads a sessionStorage flag then writes
  // it, which isn't idempotent — a second invocation would read back its
  // own write and show the notice on a genuinely first visit. The ref
  // (unlike the flag itself) survives Strict Mode's synthetic
  // unmount/remount, so this makes the effect body run its real logic only
  // once per actual mount.
  const hasCheckedProgressFlag = useRef(false);

  useEffect(() => {
    // Case B fix: navigating away mid-wizard (e.g. to Run Job Fit Analysis
    // and back) unmounts this component and silently drops all draft state —
    // persisting partial progress would mean lifting every field into
    // sessionStorage, real surface area for a form. Simpler deliberate
    // choice: restart, but say so, via a flag set on mount and cleared on
    // successful save. Tradeoff: the flag is set on mount, not on first
    // actual edit, so opening the wizard and leaving untouched shows one
    // harmless unnecessary notice next time.
    if (hasCheckedProgressFlag.current) return;
    hasCheckedProgressFlag.current = true;

    // Storage access can throw outright (Safari's "Block All Cookies",
    // some privacy extensions) rather than just returning null — an
    // uncaught throw here, inside a useEffect, would propagate straight to
    // the nearest error boundary. The restart notice is a nice-to-have;
    // skip it rather than crash the whole page over it.
    try {
      /* eslint-disable react-hooks/set-state-in-effect */
      const wasInProgress = sessionStorage.getItem(WIZARD_IN_PROGRESS_KEY) === "true";
      if (wasInProgress) {
        setShowRestartNotice(true);
      }
      sessionStorage.setItem(WIZARD_IN_PROGRESS_KEY, "true");
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Nothing to do — see comment above.
    }
  }, []);

  const mergedProfile = useMemo(() => {
    const cleanedDraft: ProfileDraft = {
      ...draft,
      rules: rulesText
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
      education: educationText
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean),
      certifications: certificationsText
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean),
      skills: skillsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      // Bullets are kept as a live string[] while typing (join/split on the
      // textarea directly, unlike the text-state fields above) so the
      // per-entry editor doesn't need parallel raw-text state per row —
      // trimmed/filtered here at merge time instead, so a stray blank line
      // mid-edit doesn't disrupt typing.
      workHistory: draft.workHistory.map((entry) => ({
        ...entry,
        bullets: entry.bullets.map((b) => b.trim()).filter(Boolean),
      })),
    };
    try {
      return mergeProfileDraft(cleanedDraft, defaultProfile);
    } catch {
      return defaultProfile;
    }
  }, [draft, rulesText, educationText, certificationsText, skillsText, defaultProfile]);

  function updateBasics(patch: Partial<Profile["basics"]>) {
    setDraft((d) => ({ ...d, basics: { ...d.basics, ...patch } }));
  }

  function updateTargets(patch: Partial<Profile["targets"]>) {
    setDraft((d) => ({ ...d, targets: { ...d.targets, ...patch } }));
  }

  function handleGenerateStoryBank(stories: StoryBankItem[]) {
    setDraft((d) => ({ ...d, storyBank: stories }));
  }

  // Shared by JSON import and resume upload — both produce the same
  // {basics, targets, storyBank, rules, workHistory, education,
  // certifications, skills} shape and merge into the draft identically, so
  // the merge itself lives in one place.
  function applyExtractedFields(fields: {
    basics: BasicsDraft;
    targets: TargetsDraft;
    storyBank: StoryBankItem[];
    rules: string[];
    workHistory: WorkHistoryEntry[];
    education: string[];
    certifications: string[];
    skills: string[];
  }) {
    const { basics, targets, storyBank, rules, workHistory, education, certifications, skills } =
      fields;
    setDraft((d) => ({
      basics: { ...d.basics, ...basics },
      targets: { ...d.targets, ...targets },
      storyBank: storyBank.length > 0 ? storyBank : d.storyBank,
      rules: rules.length > 0 ? rules : d.rules,
      workHistory: workHistory.length > 0 ? workHistory : d.workHistory,
      education: education.length > 0 ? education : d.education,
      certifications: certifications.length > 0 ? certifications : d.certifications,
      skills: skills.length > 0 ? skills : d.skills,
    }));
    if (targets.roleTypes) setRoleTypesText(targets.roleTypes.join(", "));
    if (targets.industries) setIndustriesText(targets.industries.join(", "));
    if (rules.length > 0) setRulesText(rules.join("\n"));
    if (education.length > 0) setEducationText(education.join("\n"));
    if (certifications.length > 0) setCertificationsText(certifications.join("\n"));
    if (skills.length > 0) setSkillsText(skills.join("\n"));
    setStepIndex(0);
  }

  // Resume upload gets its own apply function rather than reusing
  // applyExtractedFields: a resume describes "this is my current state," so
  // basics/targets/workHistory/education/certifications/skills — the
  // factual, exhaustively-resume-described sections — fully replace the
  // draft; a field this resume doesn't mention goes blank, never silently
  // keeps a previous resume's (or the saved profile's) stale value.
  // storyBank/rules keep the merge-style "only replace if this extraction
  // found something" fallback deliberately: they're curated content that
  // can come from sources beyond the latest resume (guided prompts, manual
  // entry) or never from a resume at all (rules almost never appear on
  // one — lib/agentPrompts.ts's PROFILE_EXTRACT_SYSTEM_PROMPT says as much)
  // — wiping either on every re-upload would trade this bug for a worse one.
  function applyResumeExtraction(fields: ProfileExtract) {
    const { basics, targets, storyBank, rules, workHistory, education, certifications, skills } =
      fields;
    setDraft((d) => ({
      basics,
      targets,
      storyBank: storyBank.length > 0 ? storyBank : d.storyBank,
      rules: rules.length > 0 ? rules : d.rules,
      workHistory,
      education,
      certifications,
      skills,
    }));
    setRoleTypesText((targets.roleTypes ?? []).join(", "));
    setIndustriesText((targets.industries ?? []).join(", "));
    if (rules.length > 0) setRulesText(rules.join("\n"));
    setEducationText(education.join("\n"));
    setCertificationsText(certifications.join("\n"));
    setSkillsText(skills.join("\n"));
    setStepIndex(0);
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportStatus(null);
    let parsedJson: unknown;
    try {
      const text = await file.text();
      parsedJson = JSON.parse(text);
    } catch {
      setImportStatus({
        tone: "error",
        text: "That file isn't valid JSON. Export a profile from this app first, or check the format.",
      });
      return;
    }
    // Field-by-field, not a full-schema parse: an imported file may be
    // partial or slightly off. Whatever validates gets pre-filled; whatever
    // doesn't is left blank for the user to fill in, same as any other
    // skippable field — reported in a plain-language summary below, not
    // treated as a hard import error.
    const result = extractImportableFields(parsedJson);
    applyExtractedFields(result);
    setImportStatus(describeImport(result));
  }

  async function handleResumeUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportStatus(null);
    setResumeStatus("loading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const textRes = await fetch("/api/resume", { method: "POST", body: formData });
      const textBody = await textRes.json();
      if (!textRes.ok) {
        setImportStatus({ tone: "error", text: textBody.error ?? "Couldn't read that file." });
        return;
      }

      const extractRes = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "profileExtract", rawInput: textBody.data.text }),
      });
      const extractBody = await extractRes.json();
      if (!extractRes.ok) {
        setImportStatus({
          tone: "error",
          text: extractBody.error ?? "Couldn't extract a profile from that resume.",
        });
        return;
      }

      applyResumeExtraction(extractBody.data as ProfileExtract);
      setImportStatus({
        tone: "success",
        text: "Pulled what we could from your resume — review each step below before saving.",
      });
    } catch {
      setImportStatus({
        tone: "error",
        text: "Could not reach the server. Check your connection and try again.",
      });
    } finally {
      setResumeStatus("idle");
    }
  }

  async function handleSave() {
    await saveProfile(mergedProfile);
    try {
      sessionStorage.removeItem(WIZARD_IN_PROGRESS_KEY);
    } catch {
      // Storage blocked — see the mount effect's comment above.
    }
    refresh();
    onSaved?.(mergedProfile);
    // First-time setup: take the user straight to the main loop. Editing an
    // existing profile: stay put — jumping away the instant "Save changes"
    // is clicked would be jarring now that both tabs are meant to be
    // reachable any time, not just on first run.
    if (!isEditing) {
      router.push("/agent");
    }
  }

  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEditing ? "Edit your profile" : "Set up your profile"}
        </h1>
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className={`h-1.5 w-8 rounded-full ${
                i <= stepIndex ? "bg-foreground" : "bg-foreground/15"
              }`}
              title={step}
            />
          ))}
        </div>
        <span className="text-xs text-text-secondary">
          Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex]}
        </span>
      </div>

      {showRestartNotice && (
        <p className="rounded-xl border border-fit-stretch/30 bg-fit-stretch/10 px-3 py-2 text-sm text-fit-stretch">
          Your previous edits weren&apos;t saved — starting fresh.
        </p>
      )}

      {stepIndex === 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className={`${secondaryButtonClass} cursor-pointer text-center`}>
              {resumeStatus === "loading" ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Spinner /> Reading your resume…
                </span>
              ) : (
                "Upload resume (PDF/DOCX)"
              )}
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={resumeStatus === "loading"}
                onChange={handleResumeUpload}
              />
            </label>
            <label className={`${secondaryButtonClass} cursor-pointer text-center`}>
              Import profile from JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
              />
            </label>
          </div>
          <p className="text-xs text-text-secondary">
            Upload a resume to pre-fill what it covers, or import a profile already exported
            from this app. Either way, anything that doesn&apos;t come through is left blank
            for you to fill in, and you can review and edit everything before saving.
          </p>
          {importStatus && (
            <p
              className={`text-sm ${
                importStatus.tone === "error"
                  ? "text-fit-low"
                  : importStatus.tone === "success"
                    ? "text-fit-strong"
                    : "text-fit-stretch"
              }`}
            >
              {importStatus.text}
            </p>
          )}
        </div>
      )}

      {stepIndex === 0 && (
        <BasicsStep draft={draft.basics} defaults={defaultProfile.basics} onChange={updateBasics} />
      )}
      {stepIndex === 1 && (
        <TargetsStep
          draft={draft.targets}
          defaults={defaultProfile.targets}
          onChange={updateTargets}
          roleTypesText={roleTypesText}
          setRoleTypesText={setRoleTypesText}
          industriesText={industriesText}
          setIndustriesText={setIndustriesText}
        />
      )}
      {stepIndex === 2 && (
        <ExperienceStep
          storyBank={draft.storyBank}
          onGenerate={handleGenerateStoryBank}
          isEditing={isEditing}
        />
      )}
      {stepIndex === 3 && (
        <CareerHistoryStep
          workHistory={draft.workHistory}
          onWorkHistoryChange={(workHistory) => setDraft((d) => ({ ...d, workHistory }))}
          educationText={educationText}
          onEducationChange={setEducationText}
          certificationsText={certificationsText}
          onCertificationsChange={setCertificationsText}
          skillsText={skillsText}
          onSkillsChange={setSkillsText}
          isEditing={isEditing}
        />
      )}
      {stepIndex === 4 && (
        <RulesStep rulesText={rulesText} onChange={setRulesText} isEditing={isEditing} />
      )}
      {stepIndex === 5 && <ReviewStep profile={mergedProfile} />}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
        >
          Back
        </button>
        {isLastStep ? (
          <button type="button" className={primaryButtonClass} onClick={handleSave}>
            {isEditing ? "Save changes" : "Create my profile"}
          </button>
        ) : (
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
