"use client";

import { createContext, useContext, type ReactNode } from "react";
import { isCurrentlySignedIn } from "@/lib/authClient";
import {
  deleteTrackerRecord as deleteLocalTrackerRecord,
  getTrackerRecords as getLocalTrackerRecords,
  saveTrackerRecord as saveLocalTrackerRecord,
} from "@/lib/trackerStorage";
import type { TrackerRecord } from "@/lib/schema";

interface TrackerStatus {
  // Same seam as ProfileStatusContext: local (anonymous, unchanged) or the
  // database (signed-in), decided here and nowhere else.
  listRecords: () => Promise<TrackerRecord[]>;
  // Takes a record without lastUpdatedDate and stamps it here — the one
  // place every save path (add, edit, paste-to-prefill) goes through, same
  // "single place stamps the timestamp" principle as profileStorage.ts's
  // saveProfile(). saveTrackerRecordForUser/saveTrackerRecord both upsert by
  // id, so this same call handles both create and edit.
  saveRecord: (record: Omit<TrackerRecord, "lastUpdatedDate">) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}

const TrackerStatusContext = createContext<TrackerStatus | null>(null);

export function TrackerStatusProvider({ children }: { children: ReactNode }) {
  async function listRecords(): Promise<TrackerRecord[]> {
    if (await isCurrentlySignedIn()) {
      const res = await fetch("/api/tracker");
      return res.ok ? ((await res.json()).data as TrackerRecord[]) : [];
    }
    return getLocalTrackerRecords();
  }

  async function saveRecord(record: Omit<TrackerRecord, "lastUpdatedDate">): Promise<void> {
    const stamped: TrackerRecord = { ...record, lastUpdatedDate: new Date().toISOString() };
    if (await isCurrentlySignedIn()) {
      await fetch(`/api/tracker/${stamped.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stamped),
      });
      return;
    }
    saveLocalTrackerRecord(stamped);
  }

  async function deleteRecord(id: string): Promise<void> {
    if (await isCurrentlySignedIn()) {
      await fetch(`/api/tracker/${id}`, { method: "DELETE" });
      return;
    }
    deleteLocalTrackerRecord(id);
  }

  return (
    <TrackerStatusContext.Provider value={{ listRecords, saveRecord, deleteRecord }}>
      {children}
    </TrackerStatusContext.Provider>
  );
}

export function useTrackerStatus(): TrackerStatus {
  const ctx = useContext(TrackerStatusContext);
  if (!ctx) {
    throw new Error("useTrackerStatus must be used within a TrackerStatusProvider");
  }
  return ctx;
}
