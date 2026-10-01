"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTrackerStatus } from "@/components/TrackerStatusContext";
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
} from "@/components/uiClasses";
import { safeGet, safeRemove, safeSessionStorage } from "@/lib/safeStorage";
import { mergeChatTrackerDraft } from "@/lib/trackerChatDraft";
import { emptyTrackerFields } from "@/lib/trackerStorage";
import {
  TRACKER_CHAT_DRAFT_HANDOFF_KEY,
  TrackerStatusSchema,
  type ChatTrackerDraft,
  type TrackerRecord,
} from "@/lib/schema";

type DraftRecord = Omit<TrackerRecord, "id" | "lastUpdatedDate"> & { id?: string };

function emptyDraft(): DraftRecord {
  return emptyTrackerFields();
}

// One-shot: the chat assistant's Edit button stashes its draft here right
// before navigating to this page, so its confirm/edit/cancel card can hand
// off to this exact same add/edit form instead of building a second one.
function readAndClearChatDraftHandoff(): ChatTrackerDraft | null {
  const raw = safeGet(safeSessionStorage, TRACKER_CHAT_DRAFT_HANDOFF_KEY);
  if (!raw) return null;
  safeRemove(safeSessionStorage, TRACKER_CHAT_DRAFT_HANDOFF_KEY);
  try {
    return JSON.parse(raw) as ChatTrackerDraft;
  } catch {
    return null;
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function RecordForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: DraftRecord;
  onChange: (patch: Partial<DraftRecord>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteStatus, setPasteStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pasteError, setPasteError] = useState("");

  async function handlePasteExtract() {
    setPasteStatus("loading");
    setPasteError("");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "trackerExtract", rawInput: pasteText }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPasteStatus("error");
        setPasteError(body.error ?? "Something went wrong.");
        return;
      }
      // Only fills fields the model actually found — never overwrites what's
      // already in the form with a blank, and never saves anything itself.
      onChange(body.data as Partial<DraftRecord>);
      setPasteStatus("idle");
      setPasteMode(false);
    } catch {
      setPasteStatus("error");
      setPasteError("Could not reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className={`${cardClass} flex flex-col gap-4 p-4`}>
      <div className="flex gap-2">
        <button
          type="button"
          className={pasteMode ? primaryButtonClass : secondaryButtonClass}
          onClick={() => setPasteMode((v) => !v)}
        >
          Paste text to pre-fill
        </button>
      </div>

      {pasteMode && (
        <div className="flex flex-col gap-2">
          <Field label="Paste a recruiter email, JD snippet, or note">
            <textarea
              className={textareaClass}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
          </Field>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={pasteText.trim() === "" || pasteStatus === "loading"}
            onClick={handlePasteExtract}
          >
            {pasteStatus === "loading" ? "Reading…" : "Pre-fill from this text"}
          </button>
          {pasteStatus === "error" && <p className="text-sm text-fit-low">{pasteError}</p>}
        </div>
      )}

      <Field label="Company">
        <input
          type="text"
          className={inputClass}
          value={draft.company}
          onChange={(e) => onChange({ company: e.target.value })}
        />
      </Field>
      <Field label="Role">
        <input
          type="text"
          className={inputClass}
          value={draft.role}
          onChange={(e) => onChange({ role: e.target.value })}
        />
      </Field>
      <Field label="Track">
        <input
          type="text"
          className={inputClass}
          value={draft.track}
          onChange={(e) => onChange({ track: e.target.value })}
        />
      </Field>
      <Field label="Comp band">
        <input
          type="text"
          className={inputClass}
          value={draft.compBand}
          onChange={(e) => onChange({ compBand: e.target.value })}
        />
      </Field>
      <Field label="Source">
        <input
          type="text"
          className={inputClass}
          value={draft.source}
          onChange={(e) => onChange({ source: e.target.value })}
        />
      </Field>
      <Field label="Applied date">
        <input
          type="date"
          className={inputClass}
          value={draft.appliedDate}
          onChange={(e) => onChange({ appliedDate: e.target.value })}
        />
      </Field>
      <Field label="Status">
        <select
          className={inputClass}
          value={draft.status}
          onChange={(e) => onChange({ status: e.target.value as TrackerRecord["status"] })}
        >
          {TrackerStatusSchema.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Next action">
        <input
          type="text"
          className={inputClass}
          value={draft.nextAction}
          onChange={(e) => onChange({ nextAction: e.target.value })}
        />
      </Field>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={primaryButtonClass}
          disabled={saving || draft.company.trim() === "" || draft.role.trim() === ""}
          onClick={onSave}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function TrackerView() {
  const { listRecords, saveRecord, deleteRecord } = useTrackerStatus();
  const [records, setRecords] = useState<TrackerRecord[] | undefined>(undefined);
  const [editing, setEditing] = useState<DraftRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listRecords().then((loaded) => {
      if (cancelled) return;
      setRecords(loaded);
      const chatDraft = readAndClearChatDraftHandoff();
      if (chatDraft) {
        const { record, matchedId } = mergeChatTrackerDraft(chatDraft, loaded);
        setEditing({ ...record, id: matchedId ?? undefined });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setRecords(await listRecords());
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    await saveRecord({ ...editing, id: editing.id ?? crypto.randomUUID() });
    setSaving(false);
    setEditing(null);
    await refresh();
  }

  async function handleDelete(id: string) {
    await deleteRecord(id);
    setConfirmingDeleteId(null);
    await refresh();
  }

  if (records === undefined) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-text-secondary">Loading your tracker…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-6 py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Application tracker</h1>
          {!editing && (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => setEditing(emptyDraft())}
            >
              Add record
            </button>
          )}
        </div>

        {editing && (
          <RecordForm
            draft={editing}
            onChange={(patch) => setEditing((d) => (d ? { ...d, ...patch } : d))}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        )}

        {records.length === 0 && !editing && (
          <p className="text-sm text-text-secondary">
            No applications tracked yet — add your first one above.
          </p>
        )}

        {records.map((record) => (
          <div key={record.id} className={`${cardClass} flex flex-col gap-2 p-4`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {record.role} · {record.company}
                </p>
                <p className="text-sm text-text-secondary">
                  {record.status} — updated {record.lastUpdatedDate.slice(0, 10)}
                </p>
              </div>
            </div>
            {record.nextAction && (
              <p className="text-sm text-text-secondary">Next: {record.nextAction}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setEditing(record)}
              >
                Edit
              </button>
              {confirmingDeleteId === record.id ? (
                <button
                  type="button"
                  className="rounded-full bg-fit-low px-6 py-3 text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
                  onClick={() => handleDelete(record.id)}
                >
                  Confirm delete
                </button>
              ) : (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => setConfirmingDeleteId(record.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
