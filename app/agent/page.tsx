"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { inputClass, labelClass, primaryButtonClass, textareaClass } from "@/components/uiClasses";
import type { FitAnalysis, Profile } from "@/lib/schema";

const PROFILE_STORAGE_KEY = "aka.profile";

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

export default function AgentPage() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [selectedTrack, setSelectedTrack] = useState("");
  const [jd, setJd] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [analysis, setAnalysis] = useState<FitAnalysis | null>(null);

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

    const trackProfile: Profile = selectedTrack
      ? { ...profile, targets: { ...profile.targets, roleTypes: [selectedTrack] } }
      : profile;

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
      <h1 className="text-2xl font-semibold tracking-tight">Run a fit analysis</h1>

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
    </main>
  );
}
