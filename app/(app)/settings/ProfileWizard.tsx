"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { emptyDraft, mergeProfileDraft, type ProfileDraft } from "@/lib/draftProfile";
import { saveProfile } from "@/lib/profileStorage";
import { WorkModeSchema, type Profile, type StoryBankItem } from "@/lib/schema";

const STEPS = ["Basics", "Targets", "Experience", "Rules", "Review"] as const;
const WIZARD_IN_PROGRESS_KEY = "aka.wizardInProgress";

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
  onSaved?: () => void;
}) {
  const router = useRouter();
  const { refresh } = useProfileStatus();
  const isEditing = !!initialProfile;
  const [stepIndex, setStepIndex] = useState(0);
  const [showRestartNotice, setShowRestartNotice] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    initialProfile
      ? {
          basics: initialProfile.basics,
          targets: initialProfile.targets,
          storyBank: initialProfile.storyBank,
          rules: [...initialProfile.rules],
        }
      : emptyDraft(defaultProfile),
  );
  const [rulesText, setRulesText] = useState(() =>
    (initialProfile ?? defaultProfile).rules.join("\n"),
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
    // Case B fix: navigating away mid-wizard (e.g. to Run Fit Analysis and
    // back) unmounts this component and silently drops all draft state —
    // persisting partial progress would mean lifting every field into
    // sessionStorage, real surface area for a form. Simpler deliberate
    // choice: restart, but say so, via a flag set on mount and cleared on
    // successful save. Tradeoff: the flag is set on mount, not on first
    // actual edit, so opening the wizard and leaving untouched shows one
    // harmless unnecessary notice next time.
    if (hasCheckedProgressFlag.current) return;
    hasCheckedProgressFlag.current = true;

    /* eslint-disable react-hooks/set-state-in-effect */
    const wasInProgress = sessionStorage.getItem(WIZARD_IN_PROGRESS_KEY) === "true";
    if (wasInProgress) {
      setShowRestartNotice(true);
    }
    sessionStorage.setItem(WIZARD_IN_PROGRESS_KEY, "true");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const mergedProfile = useMemo(() => {
    const cleanedDraft: ProfileDraft = {
      ...draft,
      rules: rulesText
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
    };
    try {
      return mergeProfileDraft(cleanedDraft, defaultProfile);
    } catch {
      return defaultProfile;
    }
  }, [draft, rulesText, defaultProfile]);

  function updateBasics(patch: Partial<Profile["basics"]>) {
    setDraft((d) => ({ ...d, basics: { ...d.basics, ...patch } }));
  }

  function updateTargets(patch: Partial<Profile["targets"]>) {
    setDraft((d) => ({ ...d, targets: { ...d.targets, ...patch } }));
  }

  function handleGenerateStoryBank(stories: StoryBankItem[]) {
    setDraft((d) => ({ ...d, storyBank: stories }));
  }

  function handleSave() {
    saveProfile(mergedProfile);
    sessionStorage.removeItem(WIZARD_IN_PROGRESS_KEY);
    refresh();
    onSaved?.();
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
          {isEditing ? "Edit your agent" : "Set up your agent"}
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
        <RulesStep rulesText={rulesText} onChange={setRulesText} isEditing={isEditing} />
      )}
      {stepIndex === 4 && <ReviewStep profile={mergedProfile} />}

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
            {isEditing ? "Save changes" : "Create my agent"}
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
