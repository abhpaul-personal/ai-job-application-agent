"use client";

import { useSession } from "next-auth/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isCurrentlySignedIn } from "@/lib/authClient";
import {
  clearProfile as clearLocalProfile,
  saveProfile as saveLocalProfile,
} from "@/lib/profileStorage";
import { safeGet, safeLocalStorage } from "@/lib/safeStorage";
import { PROFILE_STORAGE_KEY, type Profile } from "@/lib/schema";

interface ProfileStatus {
  hasProfile: boolean | undefined;
  refresh: () => void;
  isSignedIn: boolean;
  // The one seam anonymous vs. signed-in profile access goes through: local
  // (unchanged from before) or the database, decided here and nowhere else.
  loadProfile: () => Promise<Profile | null>;
  saveProfile: (profile: Profile) => Promise<void>;
  clearProfile: () => Promise<void>;
}

const ProfileStatusContext = createContext<ProfileStatus | null>(null);

// Goes through safeLocalStorage, not the bare `localStorage` global: merely
// *referencing* `localStorage` can throw when storage is blocked (Safari's
// "Block All Cookies" setting, some privacy extensions) — before you ever
// get to call a method on it. That throw happening inside a signed-out-only
// code path (this function is never called for a signed-in user — see
// refresh()/loadProfile() below) was the root cause of a settings-page
// crash — an uncaught exception here propagates out of a useEffect and
// straight to the nearest error boundary. Treating a blocked read as "no
// profile" is exactly the existing behavior for a missing or malformed
// value, so this folds into the same code path rather than adding new state.
export function readLocalProfile(): Profile | null {
  const raw = safeGet(safeLocalStorage, PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export function ProfileStatusProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const isSignedIn = status === "authenticated";
  const [hasProfile, setHasProfile] = useState<boolean | undefined>(undefined);

  function refresh() {
    if (isSignedIn) {
      // Signed-in status is settled by loadProfile()/saveProfile()/
      // clearProfile() below, which all set it explicitly — a bare
      // localStorage check here would be wrong for this branch.
      return;
    }
    // This is the exact call site that crashed the signed-out settings page:
    // a blocked-storage throw here happens synchronously inside a useEffect
    // (below), which React sends straight to the nearest error boundary.
    // See readLocalProfile's comment for why this only ever affects signed-
    // out users, and for why this must reference safeLocalStorage rather
    // than the bare `localStorage` global.
    setHasProfile(!!safeGet(safeLocalStorage, PROFILE_STORAGE_KEY));
  }

  useEffect(() => {
    if (isSignedIn) return;
    // Client-only localStorage read on mount; can't happen during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  async function loadProfile(): Promise<Profile | null> {
    if (await isCurrentlySignedIn()) {
      const res = await fetch("/api/profile");
      const profile = res.ok ? ((await res.json()).data as Profile | null) : null;
      setHasProfile(!!profile);
      return profile;
    }
    const profile = readLocalProfile();
    setHasProfile(!!profile);
    return profile;
  }

  async function saveProfile(profile: Profile): Promise<void> {
    if (await isCurrentlySignedIn()) {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setHasProfile(true);
      return;
    }
    saveLocalProfile(profile);
    setHasProfile(true);
  }

  async function clearProfile(): Promise<void> {
    if (await isCurrentlySignedIn()) {
      await fetch("/api/profile", { method: "DELETE" });
      setHasProfile(false);
      return;
    }
    clearLocalProfile();
    setHasProfile(false);
  }

  return (
    <ProfileStatusContext.Provider
      value={{ hasProfile, refresh, isSignedIn, loadProfile, saveProfile, clearProfile }}
    >
      {children}
    </ProfileStatusContext.Provider>
  );
}

export function useProfileStatus(): ProfileStatus {
  const ctx = useContext(ProfileStatusContext);
  if (!ctx) {
    throw new Error("useProfileStatus must be used within a ProfileStatusProvider");
  }
  return ctx;
}
