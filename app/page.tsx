import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { primaryButtonClass, secondaryButtonClass } from "@/components/uiClasses";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Logo className="h-12 w-12" />
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Job Kit Agent
          </h1>
          <ThemeToggle />
        </div>
        <p className="text-base font-medium text-foreground">
          Your job search, compiled into an agent.
        </p>
        <p className="text-sm text-accent-warm">
          Every application is a step. Let&apos;s make this one count.
        </p>
        <p className="max-w-md text-base text-text-secondary">
          Onboard once, and the app compiles a personalized job-application
          agent from your profile.
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link href="/settings" className={primaryButtonClass}>
          Set up my agent
        </Link>
        <Link href="/agent" className={secondaryButtonClass}>
          Open agent
        </Link>
      </div>
    </main>
  );
}
