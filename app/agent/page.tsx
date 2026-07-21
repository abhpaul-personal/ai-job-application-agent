"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
} from "@/components/uiClasses";
import { buildKitMarkdown } from "@/lib/kitMarkdown";
import { PROFILE_STORAGE_KEY, type ApplicationKit, type FitAnalysis, type Profile } from "@/lib/schema";

const RECRUITER_DM_LIMIT = 300;

function narrowToTrack(profile: Profile, track: string): Profile {
  return track
    ? { ...profile, targets: { ...profile.targets, roleTypes: [track] } }
    : profile;
}

const SCAM_FLAG_LABELS: Record<FitAnalysis["scamFlags"][number]["type"], string> = {
  genericEmailDomain: "Generic email domain",
  chatAppFirstRecruitment: "Chat-app-first recruitment",
  feeOrDepositRequest: "Fee or deposit request",
  missingFromCareersPage: "Missing from careers page",
  other: "Other",
};

function FitAnalysisView({ analysis }: { analysis: FitAnalysis }) {
  return (
    <div className="flex flex-col gap-6 rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold">{analysis.fitScore}</span>
        <span className="text-sm text-black/60 dark:text-white/60">
          / 100 — {analysis.verdict}
        </span>
      </div>

      {analysis.matchedStrengths.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={labelClass}>Matched strengths</span>
          <ul className="flex flex-col gap-1 text-sm">
            {analysis.matchedStrengths.map((s) => (
              <li key={s.storyName}>
                <span className="font-medium">{s.storyName}</span> — {s.whyItMatches}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.gaps.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={labelClass}>Gaps</span>
          <ul className="flex flex-col gap-1 text-sm text-black/70 dark:text-white/70">
            {analysis.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Salary check</span>
        <p
          className={`text-sm ${
            analysis.salaryCheck.meetsFloor
              ? "text-green-700 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {analysis.salaryCheck.meetsFloor ? "Meets your floor. " : "Below your floor. "}
          {analysis.salaryCheck.note}
        </p>
      </div>

      {analysis.scamFlags.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={labelClass}>Scam flags</span>
          <ul className="flex flex-col gap-2">
            {analysis.scamFlags.map((flag, i) => (
              <li
                key={i}
                className="rounded-md border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
              >
                <span className="font-medium">{SCAM_FLAG_LABELS[flag.type]}:</span> {flag.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the
      // button just won't flash "Copied!"; nothing else to do about it.
    }
  }

  return (
    <button type="button" className={secondaryButtonClass} onClick={handleCopy}>
      {copied ? "Copied!" : label}
    </button>
  );
}

const KIT_TABS = ["cv", "cover-letter", "recruiter-dm"] as const;
type KitTab = (typeof KIT_TABS)[number];
const KIT_TAB_LABELS: Record<KitTab, string> = {
  cv: "CV",
  "cover-letter": "Cover letter",
  "recruiter-dm": "Recruiter DM",
};

function ApplicationKitView({
  kit,
  recruiterDmDraft,
  onRecruiterDmChange,
}: {
  kit: ApplicationKit;
  recruiterDmDraft: string;
  onRecruiterDmChange: (value: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<KitTab>("cv");
  const dmLength = recruiterDmDraft.length;
  const overLimit = dmLength > RECRUITER_DM_LIMIT;
  const cvText = [kit.cvHeadline, "", ...kit.cvBullets.map((b) => `- ${b}`)].join("\n");

  function handleDownload() {
    const markdown = buildKitMarkdown({ ...kit, recruiterDm: recruiterDmDraft });
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "application-kit.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-black/10 p-4 dark:border-white/15">
      <p className="rounded-md border border-black/10 bg-black/5 px-3 py-2 text-xs text-black/70 dark:border-white/15 dark:bg-white/5 dark:text-white/70">
        AI-drafted — verify every claim before sending.
      </p>

      <div className="flex gap-2">
        {KIT_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? primaryButtonClass : secondaryButtonClass}
            onClick={() => setActiveTab(tab)}
          >
            {KIT_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeTab === "cv" && (
        <div className="flex flex-col gap-3">
          <div>
            <span className={labelClass}>Headline</span>
            <p className="text-sm">{kit.cvHeadline}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Bullets</span>
            <ul className="flex flex-col gap-1 text-sm">
              {kit.cvBullets.map((bullet, i) => (
                <li key={i}>{bullet}</li>
              ))}
            </ul>
          </div>
          <CopyButton text={cvText} />
        </div>
      )}

      {activeTab === "cover-letter" && (
        <div className="flex flex-col gap-3">
          <p className="whitespace-pre-wrap text-sm">{kit.coverLetter}</p>
          <CopyButton text={kit.coverLetter} />
        </div>
      )}

      {activeTab === "recruiter-dm" && (
        <div className="flex flex-col gap-3">
          <textarea
            className={textareaClass}
            value={recruiterDmDraft}
            onChange={(e) => onRecruiterDmChange(e.target.value)}
          />
          <p
            className={`text-xs ${
              overLimit
                ? "font-medium text-red-600 dark:text-red-400"
                : "text-black/50 dark:text-white/50"
            }`}
          >
            {dmLength} / {RECRUITER_DM_LIMIT}
            {overLimit ? ` — ${dmLength - RECRUITER_DM_LIMIT} characters over the limit` : ""}
          </p>
          <CopyButton text={recruiterDmDraft} />
        </div>
      )}

      <button type="button" className={secondaryButtonClass} onClick={handleDownload}>
        Download kit as Markdown
      </button>
    </div>
  );
}

export default function AgentPage() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [selectedTrack, setSelectedTrack] = useState("");
  const [jd, setJd] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [analysis, setAnalysis] = useState<FitAnalysis | null>(null);
  const [kit, setKit] = useState<ApplicationKit | null>(null);
  const [kitStatus, setKitStatus] = useState<"idle" | "loading" | "error">("idle");
  const [kitErrorMessage, setKitErrorMessage] = useState("");
  const [recruiterDmDraft, setRecruiterDmDraft] = useState("");

  useEffect(() => {
    // Client-only localStorage read on mount; can't happen during SSR, and
    // must land in state (not a lazy useState initializer) or the server
    // and first client render would mismatch.
    /* eslint-disable react-hooks/set-state-in-effect */
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      setProfile(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Profile;
      setProfile(parsed);
      setSelectedTrack(parsed.targets.roleTypes[0] ?? "");
    } catch {
      setProfile(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function handleRunAnalysis() {
    if (!profile) return;
    setStatus("loading");
    setErrorMessage("");
    setAnalysis(null);
    // A new analysis invalidates any kit generated against the old one.
    setKit(null);
    setKitStatus("idle");
    setKitErrorMessage("");

    const trackProfile = narrowToTrack(profile, selectedTrack);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "analysis", profile: trackProfile, jd }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(body.error ?? "Something went wrong.");
        return;
      }
      setAnalysis(body.data as FitAnalysis);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Could not reach the server. Check your connection and try again.");
    }
  }

  async function handleGenerateKit() {
    if (!profile || !analysis) return;
    setKitStatus("loading");
    setKitErrorMessage("");
    setKit(null);

    const trackProfile = narrowToTrack(profile, selectedTrack);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "kit", profile: trackProfile, jd, analysis }),
      });
      const body = await res.json();
      if (!res.ok) {
        setKitStatus("error");
        setKitErrorMessage(body.error ?? "Something went wrong.");
        return;
      }
      const newKit = body.data as ApplicationKit;
      setKit(newKit);
      setRecruiterDmDraft(newKit.recruiterDm);
      setKitStatus("idle");
    } catch {
      setKitStatus("error");
      setKitErrorMessage("Could not reach the server. Check your connection and try again.");
    }
  }

  if (profile === undefined) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-black/50 dark:text-white/50">Loading your profile…</p>
      </main>
    );
  }

  if (profile === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">No profile found</h1>
        <p className="max-w-md text-black/60 dark:text-white/60">
          Set up your agent first — your profile is stored locally in your browser.
        </p>
        <Link href="/onboarding" className={primaryButtonClass}>
          Set up my agent
        </Link>
      </main>
    );
  }

  const roleTypes = profile.targets.roleTypes;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Run a fit analysis</h1>
        <Link href="/settings" className="text-sm text-black/60 underline dark:text-white/60">
          Settings
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {roleTypes.length > 1 ? (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Track</span>
            <select
              className={inputClass}
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
            >
              {roleTypes.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">Track: {roleTypes[0]}</p>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Job description</span>
          <textarea
            className={`${textareaClass} min-h-48`}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description here"
          />
        </label>

        <button
          type="button"
          className={primaryButtonClass}
          disabled={jd.trim() === "" || status === "loading"}
          onClick={handleRunAnalysis}
        >
          {status === "loading" ? "Running fit analysis…" : "Run fit analysis"}
        </button>

        {status === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
        )}
      </div>

      {analysis && <FitAnalysisView analysis={analysis} />}

      <button
        type="button"
        className={primaryButtonClass}
        disabled={!analysis || kitStatus === "loading"}
        onClick={handleGenerateKit}
      >
        {kitStatus === "loading" ? "Generating application kit…" : "Generate application kit"}
      </button>
      {kitStatus === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{kitErrorMessage}</p>
      )}

      {kit && (
        <ApplicationKitView
          kit={kit}
          recruiterDmDraft={recruiterDmDraft}
          onRecruiterDmChange={setRecruiterDmDraft}
        />
      )}
    </main>
  );
}
