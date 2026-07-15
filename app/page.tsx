import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Logo className="h-12 w-12" />
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          AI Job Application Agent
        </h1>
        <p className="max-w-md text-base text-black/60 dark:text-white/60">
          Onboard once, and the app compiles a personalized job-application
          agent from your profile.
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/onboarding"
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Set up my agent
        </Link>
        <Link
          href="/agent"
          className="rounded-full border border-black/10 px-6 py-3 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          Open agent
        </Link>
      </div>
    </main>
  );
}
