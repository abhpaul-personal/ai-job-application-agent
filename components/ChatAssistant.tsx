"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useTrackerStatus } from "@/components/TrackerStatusContext";
import { inputClass } from "@/components/uiClasses";
import { safeSessionStorage, safeSet } from "@/lib/safeStorage";
import { describeTrackerDraft, mergeChatTrackerDraft } from "@/lib/trackerChatDraft";
import {
  TRACKER_CHAT_DRAFT_HANDOFF_KEY,
  type ChatMessage,
  type ChatTrackerDraft,
  type FitAnalysis,
  type Profile,
  type TrackerRecord,
} from "@/lib/schema";

function ChatBubbleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
    </svg>
  );
}

export function ChatAssistant({
  profile,
  analysis,
}: {
  profile: Profile;
  analysis: FitAnalysis | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [trackerRecords, setTrackerRecords] = useState<TrackerRecord[]>([]);
  const [pendingDraft, setPendingDraft] = useState<ChatTrackerDraft | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { listRecords, saveRecord } = useTrackerStatus();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status, pendingDraft]);

  useEffect(() => {
    if (!isOpen) return;
    listRecords().then(setTrackerRecords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function handleSend() {
    const text = input.trim();
    if (!text || status === "loading") return;

    const history = messages;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setStatus("loading");
    setErrorMessage("");
    // A new message supersedes any not-yet-confirmed draft from a prior
    // reply — nothing was written, so there's nothing to reconcile.
    setPendingDraft(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "chat",
          profile,
          analysis: analysis ?? undefined,
          trackerRecords,
          message: text,
          history,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(body.error ?? "Something went wrong.");
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: body.data.message as string }]);
      setPendingDraft((body.data.trackerDraft as ChatTrackerDraft | undefined) ?? null);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Could not reach the server. Check your connection and try again.");
    }
  }

  async function handleConfirmDraft() {
    if (!pendingDraft) return;
    setSavingDraft(true);
    const { record, matchedId } = mergeChatTrackerDraft(pendingDraft, trackerRecords);
    await saveRecord({ ...record, id: matchedId ?? crypto.randomUUID() });
    setTrackerRecords(await listRecords());
    setMessages((m) => [...m, { role: "assistant", content: "Saved to your tracker." }]);
    setPendingDraft(null);
    setSavingDraft(false);
  }

  function handleEditDraft() {
    if (!pendingDraft) return;
    safeSet(safeSessionStorage, TRACKER_CHAT_DRAFT_HANDOFF_KEY, JSON.stringify(pendingDraft));
    setPendingDraft(null);
    router.push("/tracker");
  }

  function handleCancelDraft() {
    setPendingDraft(null);
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-24 right-4 z-40 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-lg sm:right-6"
          style={{ maxHeight: "min(28rem, 70vh)" }}
        >
          <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
            <span className="text-sm font-semibold">Ask about this</span>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setIsOpen(false)}
              className="text-text-secondary transition-colors hover:text-foreground"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="rounded-xl border border-fit-stretch/30 bg-fit-stretch/10 px-3 py-2 text-sm text-fit-stretch">
                Ask about this analysis or your profile — I won&apos;t run analyses or generate
                kits for you.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "self-end bg-accent text-on-accent"
                    : "self-start bg-foreground/5 text-foreground"
                }`}
              >
                {m.content}
              </div>
            ))}
            {status === "loading" && (
              <div className="flex items-center gap-2 self-start text-sm text-text-secondary">
                <Spinner /> Thinking…
              </div>
            )}
            {status === "error" && <p className="text-sm text-fit-low">{errorMessage}</p>}
            {pendingDraft && (
              <div className="flex flex-col gap-2 self-stretch rounded-xl border border-foreground/10 bg-foreground/5 px-3 py-2 text-sm">
                <p className="font-medium">
                  {pendingDraft.matchedRecordId ? "Update this tracker record?" : "Add this to your tracker?"}
                </p>
                {describeTrackerDraft(pendingDraft).map((line) => (
                  <p key={line} className="text-text-secondary">
                    {line}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={savingDraft}
                    onClick={handleConfirmDraft}
                  >
                    {savingDraft ? "Saving…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-foreground/15 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={savingDraft}
                    onClick={handleEditDraft}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-foreground/15 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={savingDraft}
                    onClick={handleCancelDraft}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-foreground/10 px-3 py-3">
            <input
              type="text"
              className={`${inputClass} flex-1`}
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              disabled={status === "loading"}
            />
            <button
              type="button"
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={input.trim() === "" || status === "loading"}
              onClick={handleSend}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label={isOpen ? "Close chat" : "Ask about this analysis or your profile"}
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg transition-opacity hover:opacity-90 sm:right-6"
      >
        {isOpen ? <CloseIcon /> : <ChatBubbleIcon />}
      </button>
    </>
  );
}
