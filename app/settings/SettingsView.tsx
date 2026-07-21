"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/uiClasses";
import { PROFILE_STORAGE_KEY, ProfileSchema, type Profile } from "@/lib/schema";
import { OnboardingWizard } from "../onboarding/OnboardingWizard";

export function SettingsView({ defaultProfile }: { defaultProfile: Profile }) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [importError, setImportError] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);

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
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(parsed));
      setProfile(parsed);
    } catch {
      setImportError(
        "That file isn't a valid profile JSON. Export a profile from this app first, or check the format.",
      );
    }
  }

  function handleClear() {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setProfile(null);
    setConfirmingClear(false);
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
        <Link href="/onboarding" className={primaryButtonClass}>
          Set up my agent
        </Link>
      </main>
    );
  }

  if (isEditing) {
    return (
      <>
        <div className="mx-auto w-full max-w-xl px-6 pt-6">
          <button type="button" className={secondaryButtonClass} onClick={() => setIsEditing(false)}>
            ← Back to Settings
          </button>
        </div>
        <OnboardingWizard defaultProfile={defaultProfile} initialProfile={profile} />
      </>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-text-secondary">
          {profile.basics.name} — {profile.basics.currentTitle}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Profile</span>
        <button type="button" className={secondaryButtonClass} onClick={() => setIsEditing(true)}>
          Edit profile
        </button>
      </div>

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
              Are you sure? This deletes your profile from this browser and can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="w-full sm:w-auto rounded-full bg-fit-low px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
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
    </main>
  );
}
