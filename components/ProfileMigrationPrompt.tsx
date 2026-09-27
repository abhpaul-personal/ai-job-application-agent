"use client";

import { useEffect, useState } from "react";
import { readLocalProfile, useProfileStatus } from "@/components/ProfileStatusContext";
import { secondaryButtonClass } from "@/components/uiClasses";
import { shouldOfferMigration } from "@/lib/profileMigration";
import type { Profile } from "@/lib/schema";

// The one confirm moment docs/PHASE4-ROADMAP.md's migration design calls
// for: on first sign-in with a browser-local profile and no account profile
// yet, ask before writing anything — never silent, and only once per
// session (declining doesn't nag again on every page).
export function ProfileMigrationPrompt() {
  const { isSignedIn, loadProfile, saveProfile } = useProfileStatus();
  const [localProfile, setLocalProfile] = useState<Profile | null>(null);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSignedIn || dismissedThisSession) {
      // Resetting synchronously here (rather than only via the async path
      // below) is deliberate: sign-out or a decline must clear the banner
      // immediately, not after a network round trip.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalProfile(null);
      return;
    }
    let cancelled = false;
    loadProfile().then((dbProfile) => {
      if (cancelled) return;
      const local = readLocalProfile();
      setLocalProfile(shouldOfferMigration(isSignedIn, dbProfile, local) ? local : null);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, dismissedThisSession]);

  async function handleConfirm() {
    if (!localProfile) return;
    setSaving(true);
    await saveProfile(localProfile);
    setSaving(false);
    setDismissedThisSession(true);
  }

  if (!localProfile) return null;

  return (
    <div className="mx-6 mt-4 flex flex-col gap-3 rounded-xl border border-fit-stretch/30 bg-fit-stretch/10 px-4 py-3 text-sm text-fit-stretch sm:mx-8">
      <p>
        Save this profile to your account? You have a profile saved in this browser that
        isn&apos;t linked to your signed-in account yet — nothing is saved unless you say so.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={saving}
          onClick={handleConfirm}
        >
          {saving ? "Saving…" : "Save it"}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => setDismissedThisSession(true)}
        >
          Start fresh instead
        </button>
      </div>
    </div>
  );
}
