"use client";

import { primaryButtonClass } from "@/components/uiClasses";

// Without this, an uncaught render error anywhere under (app) (settings,
// agent, tracker) fell through to Next's built-in production fallback,
// which shows a bare "This page couldn't load" with no way to recover
// short of a manual reload — worse than useless for anything intermittent
// (e.g. a stale/undecodable session cookie), since the user has no signal
// of what to try. This gives them a retry affordable in place.
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-text-secondary">
        That&apos;s on us, not your data — nothing you entered was lost. Try again, and if it
        keeps happening, a plain page reload usually clears it.
      </p>
      <button type="button" className={primaryButtonClass} onClick={reset}>
        Try again
      </button>
    </main>
  );
}
