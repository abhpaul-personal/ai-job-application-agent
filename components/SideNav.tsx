"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { AuthStatus } from "@/components/AuthStatus";
import { Logo } from "@/components/Logo";
import { useProfileStatus } from "@/components/ProfileStatusContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_LINK_BASE = "rounded-full px-4 py-2 text-sm font-medium transition-colors";
const NAV_LINK_ACTIVE = "bg-accent text-on-accent";
const NAV_LINK_INACTIVE = "text-foreground hover:bg-foreground/5";

export function SideNav() {
  const pathname = usePathname();
  const { hasProfile } = useProfileStatus();
  const { data: session, status } = useSession();

  // hasProfile is `undefined` briefly on first mount (client-only localStorage
  // read) — falls through to "Set Up My Agent" during that flash, same
  // accepted tradeoff used elsewhere in the app for non-blocking UI state.
  const tab1Label = hasProfile ? "Agent Settings" : "Set Up My Agent";
  const tab1Active = pathname.startsWith("/settings");
  const tab2Active = pathname.startsWith("/agent");
  const tab3Active = pathname.startsWith("/tracker");

  return (
    <nav className="flex shrink-0 flex-row flex-wrap items-center gap-2 border-b border-foreground/10 px-6 py-4 sm:w-56 sm:flex-col sm:items-stretch sm:border-b-0 sm:border-r sm:px-4 sm:py-8">
      <div className="mr-auto flex flex-col gap-1 sm:mr-0 sm:mb-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-7 w-7 sm:h-8 sm:w-8" />
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Job Kit Agent
            </span>
          </Link>
          <ThemeToggle />
        </div>
        {status === "authenticated" && session.user?.name && (
          <span className="text-sm font-semibold tracking-tight sm:text-base">
            Welcome, {session.user.name}
          </span>
        )}
      </div>
      <Link
        href="/settings"
        className={`${NAV_LINK_BASE} ${tab1Active ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
      >
        {tab1Label}
      </Link>
      <Link
        href="/agent"
        className={`${NAV_LINK_BASE} ${tab2Active ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
      >
        Run Job Fit Analysis
      </Link>
      <Link
        href="/tracker"
        className={`${NAV_LINK_BASE} ${tab3Active ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}`}
      >
        Tracker
      </Link>
      {/* Fixed (not sm:mt-auto) so it stays pinned to the viewport corner
          while the page scrolls, instead of sitting at the bottom of
          whatever height the sidebar column happens to stretch to. */}
      <div className="fixed bottom-4 left-4 z-40 rounded-full bg-background/95 shadow-sm backdrop-blur">
        <AuthStatus />
      </div>
    </nav>
  );
}
