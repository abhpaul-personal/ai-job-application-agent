"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTrackerStatus } from "@/components/TrackerStatusContext";
import { cardClass, secondaryButtonClass } from "@/components/uiClasses";
import { safeSessionStorage, safeSet } from "@/lib/safeStorage";
import { buildKitAppliedRecord, describeTrackerDraft } from "@/lib/trackerChatDraft";
import { TRACKER_CHAT_DRAFT_HANDOFF_KEY, type TrackerDraft } from "@/lib/schema";

type Stage = "asking" | "extracting" | "reviewing" | "resolved";

// Rendered with key={jd at generation time} by the caller (app/(app)/agent/
// page.tsx) — that key is the entire "dedupe for the same generated kit"
// mechanism: regenerating a kit for the same JD reuses this component
// instance (so an already-resolved answer stays resolved), while a
// genuinely different JD gets a fresh instance and a fresh prompt. Nothing
// about the dismissal is persisted anywhere, by design.
export function KitAppliedPrompt({ jd, fallbackRole }: { jd: string; fallbackRole: string }) {
  const { saveRecord } = useTrackerStatus();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("asking");
  const [record, setRecord] = useState<ReturnType<typeof buildKitAppliedRecord> | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleYes() {
    setStage("extracting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "trackerExtract", rawInput: jd }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorMessage(body.error ?? "Something went wrong.");
        setStage("asking");
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      setRecord(buildKitAppliedRecord(body.data as TrackerDraft, fallbackRole, today));
      setStage("reviewing");
    } catch {
      setErrorMessage("Could not reach the server. Check your connection and try again.");
      setStage("asking");
    }
  }

  async function handleConfirmSave() {
    if (!record) return;
    await saveRecord({ ...record, id: crypto.randomUUID() });
    setSaved(true);
    setStage("resolved");
  }

  function handleEdit() {
    if (!record) return;
    safeSet(safeSessionStorage, TRACKER_CHAT_DRAFT_HANDOFF_KEY, JSON.stringify(record));
    setStage("resolved");
    router.push("/tracker");
  }

  if (stage === "resolved") {
    return saved ? (
      <p className="text-sm text-text-secondary">Added to your tracker.</p>
    ) : null;
  }

  return (
    <div className={`flex flex-col gap-3 p-5 ${cardClass}`}>
      {stage !== "reviewing" ? (
        <>
          <p className="text-sm font-medium">Did you apply to this job?</p>
          {errorMessage && <p className="text-sm text-fit-low">{errorMessage}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={stage === "extracting"}
              onClick={handleYes}
            >
              {stage === "extracting" ? "Reading the job description…" : "Yes"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={stage === "extracting"}
              onClick={() => setStage("resolved")}
            >
              Not now
            </button>
          </div>
        </>
      ) : (
        record && (
          <>
            <p className="text-sm font-medium">Add this to your tracker?</p>
            {describeTrackerDraft(record).map((line) => (
              <p key={line} className="text-sm text-text-secondary">
                {line}
              </p>
            ))}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
                onClick={handleConfirmSave}
              >
                Confirm & save
              </button>
              <button type="button" className={secondaryButtonClass} onClick={handleEdit}>
                Edit
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setStage("resolved")}
              >
                Cancel
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}
