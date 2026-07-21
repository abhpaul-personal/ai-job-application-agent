"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useProfileStatus } from "@/components/ProfileStatusContext";

const NAV_LINK_BASE = "rounded-full px-4 py-2 text-sm font-medium transition-colors";
const NAV_LINK_ACTIVE = "bg-accent text-background";
const NAV_LINK_INACTIVE = "text-foreground hover:bg-foreground/5";

export function SideNav() {
  const pathname = usePathname();
  const { hasProfile } = useProfileStatus();

  // hasProfile is `undefined` briefly on first mount (client-only localStorage
  // read) — falls through to "Set Up My Agent" during that flash, same
  // accepted tradeoff used elsewhere in the app for non-blocking UI state.
  const tab1Label = hasProfile ? "Agent Settings" : "Set Up My Agent";
  const tab1Active = pathname.startsWith("/settings");
  const tab2Active = pathname.startsWith("/agent");

  return (
    <nav className="flex shrink-0 flex-row items-center gap-2 border-b border-foreground/10 px-6 py-4 sm:w-56 sm:flex-col sm:items-stretch sm:border-b-0 sm:border-r sm:px-4 sm:py-8">
      <Link href="/" className="mb-8 hidden items-center gap-2 sm:flex">
        <Logo className="h-8 w-8" />
      </Link>
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
        Run Fit Analysis
      </Link>
    </nav>
  );
}
