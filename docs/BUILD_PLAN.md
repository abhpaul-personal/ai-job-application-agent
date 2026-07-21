# Build Plan — Claude Code milestone prompts

Work one milestone per Claude Code session. Paste the prompt, review the plan Claude proposes BEFORE accepting edits, run the app after each milestone, then commit. Never move to the next milestone with a broken build.

Recommended session habits:
- Start each session with: "Read CLAUDE.md and docs/PRD.md before doing anything."
- Ask Claude Code to use plan mode for M2–M4 (the architectural milestones).
- After each milestone: `git add -A && git commit -m "M<n>: <summary>"` and push.

---

## M0 — Environment (no Claude Code yet, ~20 min)

1. Install Node.js LTS from nodejs.org (needed for Next.js itself).
2. Install Claude Code — use the native installer from the official docs (code.claude.com/docs → setup). Verify with `claude --version`, then `claude doctor`.
3. Authenticate: run `claude` and sign in (requires a paid Claude plan, or a Console API key for pay-per-use).
4. Create the GitHub repo `ai-job-application-agent` (public), clone it, copy this starter pack's files in (README.md, CLAUDE.md, docs/, config/).
5. Get an Anthropic API key from console.anthropic.com for the app itself (separate from Claude Code auth).

## M1 — Scaffold

> Read CLAUDE.md and docs/PRD.md. Scaffold a Next.js App Router project with TypeScript and Tailwind CSS in this repo, keeping the existing README, CLAUDE.md, docs/ and config/ folders. Add: .env.example with ANTHROPIC_API_KEY placeholder; .gitignore covering .env.local, node_modules, .next, and config/profile.local.json; a minimal landing page with the app name and two buttons ("Set up my agent" → /onboarding, "Open agent" → /agent, both routes can be placeholders). Confirm `npm run dev` works before finishing.

## M2 — Profile schema + prompt compiler (the core IP)

> Read CLAUDE.md, docs/PRD.md sections 4.1 and 5. Use plan mode first. Build: (1) lib/schema.ts — Zod schemas for Profile (basics, targets, storyBank, rules, formats) and for the two agent output stages (FitAnalysis, ApplicationKit), matching the PRD; (2) lib/compilePrompt.ts — a pure function compileSystemPrompt(profile: Profile): string that renders the profile into an agent system prompt with sections: candidate ground truth, hard rules, salary floor, scam-screen heuristics, output-contract instructions. Enforce a rough token budget by capping the story bank at 8 items; (3) load config/default-profile.example.json and validate it against the schema at build time; if config/profile.local.json exists, it overrides the example; (4) unit tests (Vitest) for the schema and compiler — including a snapshot test of the compiled prompt for the example profile. All tests must pass.

## M3 — Onboarding wizard

> Read docs/PRD.md section 4.1. Build the /onboarding route as a 5-step wizard exactly as specified: Basics, Targets, Experience (paste CV text OR guided prompts — the AI conversion call can be stubbed for now to return a hardcoded story bank), Rules (prefilled from the default profile), Review & compile (show profile JSON and compiled prompt preview, then save to localStorage under key "aka.profile" and route to /agent). Every field skippable with defaults inherited. Keep the UI clean and mobile-friendly; use the existing Tailwind setup. No localStorage writes until the final step.

## M4 — Agent API route + fit analysis

> Read docs/PRD.md sections 4.2 and 5 (FR3, FR4). Build: (1) app/api/agent/route.ts — POST handler taking {stage: "analysis" | "kit", profile, jd, analysis?}; it compiles the system prompt server-side, calls the Anthropic Messages API (model claude-sonnet-4-6, key from process.env.ANTHROPIC_API_KEY), demands JSON-only output per the Zod stage schema, validates the response, retries once with a repair message on invalid JSON, returns typed JSON or a clear error; (2) the /agent page: JD textarea, track selector from profile.targets, "Run fit analysis" → renders FitAnalysis (score, verdict, strengths mapped to story names, gaps, salary note, scam flags with warning styling). Also wire the real story-bank extraction call from M3's stub through this same route with a new stage "extract".

## M5 — Application kit + export

> Read docs/PRD.md section 4.2 steps 3–5. On the /agent page, after an analysis is rendered, enable "Generate application kit" (disabled before — enforce the human checkpoint). Call stage "kit" with the JD + approved analysis. Render tabs: CV headline + bullets, cover letter (respect profile.formats), recruiter DM with live character count and a hard 300-char warning. Add per-section copy buttons and "Download kit as Markdown". Add the "AI-drafted — verify every claim before sending" notice.

## M6 — Polish, deploy, publish

> Read README.md. Final pass: (1) settings page — edit profile, export/import JSON, clear data; (2) empty states and error states per the PRD; (3) responsive check at 380px width; (4) update README status checklist and add a short "Build log" section summarizing what each milestone shipped; (5) prepare for Vercel: confirm the app builds with `npm run build` and document the ANTHROPIC_API_KEY env var step in the README.

Then manually: deploy on Vercel (import the GitHub repo, set ANTHROPIC_API_KEY), record a 90-second demo, take 3 screenshots for the README.

## Beyond M6 (planned, parked)

Two roadmaps exist for after the core MVP: `docs/PHASE2-ROADMAP.md` (Pipeline Intelligence — application tracker, insight cards) and `docs/PHASE3-ROADMAP.md` (Accounts & Persisted Profiles — Google sign-in, database persistence). Both are status NOT STARTED — do not begin either until M6 has shipped and the app is deployed and stable.

---

## LinkedIn post skeleton (save for launch day)

Hook: "I'm a PM, not an engineer. I shipped an AI agent factory in <n> evenings with Claude Code."
Body: the problem (manual application pipeline) → the insight (the agent should be compiled from the user, not generic) → 3 agent-design patterns you implemented (prompt-as-spec, structured output contracts, human-in-the-loop) → what you learned about PM'ing an AI build.
CTA: repo link + live demo link. Tag: #BuildInPublic #ProductManagement #AIAgents.
