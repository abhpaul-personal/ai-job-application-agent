"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useChatAnalysis } from "@/components/ChatAnalysisContext";
import { KitAppliedPrompt } from "@/components/KitAppliedPrompt";
import { useProfileStatus } from "@/components/ProfileStatusContext";
import { Spinner } from "@/components/Spinner";
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
} from "@/components/uiClasses";
import { getWeeklyAnalysisCount, incrementWeeklyAnalysisCount } from "@/lib/effortTracking";
import { buildDocxBytes, buildPdfBytes } from "@/lib/kitExport";
import { buildKitMarkdown } from "@/lib/kitMarkdown";
import type { ApplicationKit, FitAnalysis, Profile } from "@/lib/schema";

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
    <div className={`flex flex-col gap-6 p-5 ${cardClass}`}>
      <div className="flex flex-col gap-1">
        <span className="text-xl font-semibold">{analysis.verdict}</span>
        <span className="text-sm text-text-secondary">Fit score: {analysis.fitScore} / 100</span>
        <span className="text-sm text-accent-warm">
          This is a starting signal, not a verdict — you decide what to do with it.
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
          <ul className="flex flex-col gap-1 text-sm text-text-secondary">
            {analysis.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
          <p className="text-sm text-text-secondary italic">
            Gaps aren&apos;t disqualifiers — they&apos;re your prep list.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Salary check</span>
        <p
          className={`text-sm ${
            analysis.salaryCheck.meetsFloor ? "text-fit-strong" : "text-fit-low"
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
                className="rounded-xl border border-fit-stretch/30 bg-fit-stretch/10 px-3 py-2 text-sm text-fit-stretch"
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

const KIT_TABS = ["cv", "cover-letter", "recruiter-email"] as const;
type KitTab = (typeof KIT_TABS)[number];
const KIT_TAB_LABELS: Record<KitTab, string> = {
  cv: "CV Content",
  "cover-letter": "Cover letter",
  "recruiter-email": "Recruiter email",
};

function downloadBytes(bytes: Uint8Array, filename: string, mimeType: string) {
  // TS's DOM lib types BlobPart against Uint8Array<ArrayBuffer> specifically;
  // Uint8Array's own return type is the wider Uint8Array<ArrayBufferLike> as
  // of TS 5.7+. Structurally identical at runtime — a plain cast is safe.
  const blob = new Blob([bytes as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Shared by the CV and cover-letter tabs — both just need "download this
// title + these body lines as PDF/DOCX", so the pair of buttons and their
// handlers live in one place instead of twice.
function FileExportButtons({
  title,
  bodyParagraphs,
  filenameBase,
}: {
  title: string;
  bodyParagraphs: string[];
  filenameBase: string;
}) {
  async function handleExport(format: "pdf" | "docx") {
    if (format === "pdf") {
      downloadBytes(buildPdfBytes(title, bodyParagraphs), `${filenameBase}.pdf`, "application/pdf");
    } else {
      const bytes = await buildDocxBytes(title, bodyParagraphs);
      downloadBytes(
        bytes,
        `${filenameBase}.docx`,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    }
  }

  return (
    <div className="flex gap-2">
      <button type="button" className={secondaryButtonClass} onClick={() => handleExport("pdf")}>
        Download as PDF
      </button>
      <button type="button" className={secondaryButtonClass} onClick={() => handleExport("docx")}>
        Download as DOCX
      </button>
    </div>
  );
}

function ApplicationKitView({
  kit,
  recruiterEmailDraft,
  onRecruiterEmailChange,
}: {
  kit: ApplicationKit;
  recruiterEmailDraft: string;
  onRecruiterEmailChange: (value: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<KitTab>("cv");
  const cvText = [kit.cvHeadline, "", ...kit.cvBullets.map((b) => `- ${b}`)].join("\n");

  function handleDownloadMarkdown() {
    const markdown = buildKitMarkdown({ ...kit, recruiterEmail: recruiterEmailDraft });
    downloadBytes(new TextEncoder().encode(markdown), "application-kit.md", "text/markdown");
  }

  return (
    <div className={`flex flex-col gap-4 p-5 ${cardClass}`}>
      <p className="text-sm text-accent-warm">Kit ready — that&apos;s one more in.</p>
      <p className="rounded-xl border border-fit-stretch/30 bg-fit-stretch/10 px-3 py-2 text-sm text-fit-stretch">
        AI-drafted from your profile. Read it once, make it yours, then send.
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
          <div className="flex flex-wrap gap-2">
            <CopyButton text={cvText} />
            <FileExportButtons
              title={kit.cvHeadline}
              bodyParagraphs={kit.cvBullets.map((b) => `• ${b}`)}
              filenameBase="cv"
            />
          </div>
        </div>
      )}

      {activeTab === "cover-letter" && (
        <div className="flex flex-col gap-3">
          <p className="whitespace-pre-wrap text-sm">{kit.coverLetter}</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={kit.coverLetter} />
            <FileExportButtons
              title="Cover Letter"
              bodyParagraphs={kit.coverLetter.split("\n")}
              filenameBase="cover-letter"
            />
          </div>
        </div>
      )}

      {activeTab === "recruiter-email" && (
        <div className="flex flex-col gap-3">
          <textarea
            className={textareaClass}
            value={recruiterEmailDraft}
            onChange={(e) => onRecruiterEmailChange(e.target.value)}
          />
          <CopyButton text={recruiterEmailDraft} />
        </div>
      )}

      <button type="button" className={secondaryButtonClass} onClick={handleDownloadMarkdown}>
        Download kit as Markdown
      </button>
    </div>
  );
}

export default function AgentPage() {
  const { loadProfile } = useProfileStatus();
  const { setAnalysis: setGlobalAnalysis } = useChatAnalysis();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [selectedTrack, setSelectedTrack] = useState("");
  const [jd, setJd] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [analysis, setAnalysis] = useState<FitAnalysis | null>(null);
  const [kit, setKit] = useState<ApplicationKit | null>(null);
  const [kitStatus, setKitStatus] = useState<"idle" | "loading" | "error">("idle");
  const [kitErrorMessage, setKitErrorMessage] = useState("");
  const [recruiterEmailDraft, setRecruiterEmailDraft] = useState("");
  const [weeklyCount, setWeeklyCount] = useState(0);
  // The JD as it was when the current kit was generated, not the live
  // textarea — so later edits to jd (before the "did you apply?" prompt is
  // answered) can't change what that prompt is asking about, and so the key
  // passed to KitAppliedPrompt below stays stable for a given kit.
  const [kitJd, setKitJd] = useState("");

  useEffect(() => {
    // Purely decorative counter — a brief flash from 0 to the real value on
    // mount is an acceptable tradeoff here, unlike the profile load below
    // which needs the full undefined/null/loaded state machine.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeeklyCount(getWeeklyAnalysisCount());
  }, []);

  useEffect(() => {
    // Client-only read on mount; can't happen during SSR, and must land in
    // state (not a lazy useState initializer) or the server and first
    // client render would mismatch. loadProfile() reads localStorage or the
    // database depending on sign-in state — this component doesn't need to
    // know which.
    let cancelled = false;
    loadProfile().then((loaded) => {
      if (cancelled) return;
      setProfile(loaded);
      if (loaded) {
        setSelectedTrack(loaded.targets.roleTypes[0] ?? "");
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Publishes this page's analysis to the globally-mounted chat assistant
    // (GlobalChatAssistant, in app/(app)/layout.tsx) so "why did this score
    // X" keeps working here specifically — the assistant itself no longer
    // lives inside this page. Clears back to null on unmount so leaving
    // /agent doesn't leave a stale analysis in scope on other pages.
    setGlobalAnalysis(analysis);
    return () => setGlobalAnalysis(null);
  }, [analysis, setGlobalAnalysis]);

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
      setWeeklyCount(incrementWeeklyAnalysisCount());
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
      setKitJd(jd);
      setRecruiterEmailDraft(newKit.recruiterEmail);
      setKitStatus("idle");
    } catch {
      setKitStatus("error");
      setKitErrorMessage("Could not reach the server. Check your connection and try again.");
    }
  }

  if (profile === undefined) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-text-secondary">Getting your profile ready…</p>
      </main>
    );
  }

  if (profile === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Let&apos;s get you set up</h1>
        <p className="max-w-md text-text-secondary">
          It only takes a few minutes, and you can skip anything you&apos;re not sure about —
          your profile stays right here in your browser.
        </p>
        <Link href="/settings" className={primaryButtonClass}>
          Set up my agent
        </Link>
      </main>
    );
  }

  const roleTypes = profile.targets.roleTypes;
  const hasWarnings = analysis
    ? analysis.fitScore < 50 || !analysis.salaryCheck.meetsFloor || analysis.scamFlags.length > 0
    : false;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Run a job fit analysis</h1>

        {weeklyCount > 0 && (
          <p className="-mt-6 text-xs text-text-secondary">
            {weeklyCount} {weeklyCount === 1 ? "role" : "roles"} analyzed this week
          </p>
        )}

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
            <p className="text-sm text-text-secondary">Track: {roleTypes[0]}</p>
          )}

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Job description</span>
            <textarea
              className={`${textareaClass} min-h-48`}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste it in — we'll look at it together."
            />
          </label>

          <button
            type="button"
            className={primaryButtonClass}
            disabled={jd.trim() === "" || status === "loading"}
            onClick={handleRunAnalysis}
          >
            {status === "loading" ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Spinner /> Running job fit analysis…
              </span>
            ) : (
              "Run job fit analysis"
            )}
          </button>

          {status === "error" && <p className="text-sm text-fit-low">{errorMessage}</p>}
        </div>

        {analysis && <FitAnalysisView analysis={analysis} />}

        {hasWarnings && (
          <p className="text-sm text-fit-low">
            This one has real gaps — worth a second look before you generate a kit.
          </p>
        )}

        <button
          type="button"
          className={primaryButtonClass}
          disabled={!analysis || kitStatus === "loading"}
          onClick={handleGenerateKit}
        >
          {kitStatus === "loading" ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Spinner /> Generating application kit…
            </span>
          ) : (
            "Generate application kit"
          )}
        </button>
        {kitStatus === "error" && <p className="text-sm text-fit-low">{kitErrorMessage}</p>}

        {kit && (
          <>
            <ApplicationKitView
              kit={kit}
              recruiterEmailDraft={recruiterEmailDraft}
              onRecruiterEmailChange={setRecruiterEmailDraft}
            />
            <KitAppliedPrompt key={kitJd} jd={kitJd} fallbackRole={selectedTrack} />
          </>
        )}
    </main>
  );
}
