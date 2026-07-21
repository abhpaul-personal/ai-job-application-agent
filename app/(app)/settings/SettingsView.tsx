"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useProfileStatus } from "@/components/ProfileStatusContext";
import { labelClass, secondaryButtonClass } from "@/components/uiClasses";
import {
  clearProfile,
  formatRelativeTime,
  getProfileUpdatedAt,
  saveProfile,
} from "@/lib/profileStorage";
import { PROFILE_STORAGE_KEY, ProfileSchema, type Profile } from "@/lib/schema";
import { ProfileWizard } from "./ProfileWizard";

export function SettingsView({ defaultProfile }: { defaultProfile: Profile }) {
  const { refresh } = useProfileStatus();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [importError, setImportError] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  // Bumped only on import/clear (data replaced from *outside* the wizard) to
  // force ProfileWizard to remount and re-seed its draft — its internal
  // state is otherwise a one-time lazy useState that won't notice
  // initialProfile changing under it. Not bumped on the wizard's own save,
  // so saving in edit mode stays on the same step, same instance.
  const [wizardResetNonce, setWizardResetNonce] = useState(0);

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
      setProfile(JSON.parse(raw) as Profile);
      setUpdatedAt(getProfileUpdatedAt());
    } catch {
      setProfile(null);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function handleExport() {
    if (!profile) return;
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aka-profile.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError("");
    try {
      const text = await file.text();
      const parsed = ProfileSchema.parse(JSON.parse(text));
      saveProfile(parsed);
      setProfile(parsed);
      setUpdatedAt(getProfileUpdatedAt());
      setWizardResetNonce((n) => n + 1);
      refresh();
    } catch {
      setImportError(
        "That file isn't a valid profile JSON. Export a profile from this app first, or check the format.",
      );
    }
  }

  function handleClear() {
    clearProfile();
    setProfile(null);
    setUpdatedAt(null);
    setConfirmingClear(false);
    setWizardResetNonce((n) => n + 1);
    refresh();
  }

  function handleWizardSaved() {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      try {
        setProfile(JSON.parse(raw) as Profile);
      } catch {
        // The wizard itself just wrote this via saveProfile() — it's valid.
      }
    }
    setUpdatedAt(getProfileUpdatedAt());
  }

  if (profile === undefined) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-text-secondary">Getting your profile ready…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      {profile && (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 pt-12">
          {updatedAt && (
            <p className="text-xs text-text-secondary">
              Profile last updated: {formatRelativeTime(updatedAt)}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Backup</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className={secondaryButtonClass} onClick={handleExport}>
                Export profile as JSON
              </button>
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
            {importError && <p className="text-sm text-fit-low">{importError}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Danger zone</span>
            {confirmingClear ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-fit-low">
                  Are you sure? This deletes your profile from this browser and can&apos;t be
                  undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="w-full sm:w-auto rounded-full bg-fit-low px-6 py-3 text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
                    onClick={handleClear}
                  >
                    Confirm clear
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => setConfirmingClear(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setConfirmingClear(true)}
              >
                Clear all data
              </button>
            )}
          </div>
        </div>
      )}

      <ProfileWizard
        key={wizardResetNonce}
        defaultProfile={defaultProfile}
        initialProfile={profile ?? undefined}
        onSaved={handleWizardSaved}
      />
    </main>
  );
}
