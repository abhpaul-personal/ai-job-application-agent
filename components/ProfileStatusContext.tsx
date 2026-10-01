"use client";

import { useSession } from "next-auth/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isCurrentlySignedIn } from "@/lib/authClient";
import {
  clearProfile as clearLocalProfile,
  saveProfile as saveLocalProfile,
} from "@/lib/profileStorage";
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

// localStorage.getItem can throw (not just return null) when storage access
// itself is blocked — Safari's "Block All Cookies" setting, Safari Private
// Browsing on older versions, or some privacy extensions all disable web
// storage entirely rather than just cookies. That throw happening inside a
// signed-out-only code path (this function is never called for a signed-in
// user — see refresh()/loadProfile() below) is the root cause of the
// settings-page crash this function's callers were chasing: an uncaught
// exception here propagates out of a useEffect and straight to the nearest
// error boundary. Treating a blocked read as "no profile" is exactly the
// existing behavior for a missing or malformed value, so this folds into
// the same code path rather than adding new state.
export function readLocalProfile(): Profile | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }
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
    // out users. Caught the same way: no access means no profile.
    try {
      setHasProfile(!!localStorage.getItem(PROFILE_STORAGE_KEY));
    } catch {
      setHasProfile(false);
    }
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
