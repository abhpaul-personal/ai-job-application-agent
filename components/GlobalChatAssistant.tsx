"use client";

import { useEffect, useState } from "react";
import { ChatAssistant } from "@/components/ChatAssistant";
import { useChatAnalysis } from "@/components/ChatAnalysisContext";
import { useProfileStatus } from "@/components/ProfileStatusContext";
import type { Profile } from "@/lib/schema";

// Mounted once in app/(app)/layout.tsx so the floating assistant is present
// on every page (settings, agent, tracker) — a single instance, not one
// forked per page. Only renders once a profile exists, same as the assistant
// previously only appearing on /agent once its own profile load resolved.
export function GlobalChatAssistant() {
  const { loadProfile, isSignedIn } = useProfileStatus();
  const { analysis } = useChatAnalysis();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadProfile().then((loaded) => {
      if (!cancelled) setProfile(loaded);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  if (!profile) return null;
  return <ChatAssistant profile={profile} analysis={analysis} />;
}
