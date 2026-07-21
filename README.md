# Job Kit Agent

**An agent factory for job seekers.** Complete a short onboarding, and the app compiles a personalized AI agent that analyses any job description against *your* profile — then drafts your tailored CV bullets, cover letter, and recruiter outreach in seconds.

Built by a Product Manager using Claude Code, as an exploration of agent design patterns: prompt-as-spec, structured outputs, human-in-the-loop checkpoints, and profile-to-prompt compilation.

## The idea

Most "AI job tools" are generic. This one isn't — because the agent is *generated from you*:

1. **Onboard once.** Enter your name, current CTC, expected range, target role types, and paste your base CV (or answer guided prompts instead). Skip anything and sensible defaults apply.
2. **The app compiles your agent.** Your profile becomes a structured JSON config, which is compiled into a system prompt — your personal rules become the agent's hard constraints.
3. **Use it per application.** Paste any JD. Stage 1: fit analysis (score, matched strengths mapped to your experience, gaps, salary-floor check, scam-posting screen). Stage 2 — only after you approve the analysis: a full application kit (CV headline + bullets, cover letter, sub-300-char recruiter DM).

## Agent design patterns demonstrated

- **Profile → prompt compilation**: user config deterministically compiled into the agent's system prompt. The prompt is the spec.
- **Two-stage agent loop with HITL**: analysis and drafting are separate calls; the human approves the analysis before drafting begins.
- **Structured output contracts**: every model call returns JSON validated against a schema and rendered directly into UI — no free-prose parsing.
- **Guardrails as config**: salary floor, framing rules, and scam-check heuristics live in user data, not hardcoded logic.

## Stack

Next.js (App Router) · Tailwind CSS · Anthropic Claude API (via a server-side API route) · Vercel

## Running locally

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Your profile is stored locally in your browser (exportable/importable as JSON from Settings). No accounts, no database, no profile data leaves your machine except inside API calls to Anthropic.

## Deploying

1. Import this repo into [Vercel](https://vercel.com/new).
2. In the project's **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` (get one from [console.anthropic.com](https://console.anthropic.com)) — this is the same variable `.env.local` uses locally.
3. Deploy. No build configuration needed; Vercel detects Next.js automatically.

## Privacy note

The repo ships with a fictional demo profile (`config/default-profile.example.json`). Real personal profiles are created at runtime in the browser, or kept in `config/profile.local.json` (gitignored).

## Status

- [x] v0 prototype (Claude artifact, single hardcoded profile)
- [x] M1 Scaffold
- [x] M2 Profile schema + prompt compiler
- [x] M3 Onboarding wizard
- [x] M4 Fit-analysis agent
- [x] M5 Application kit generation + export
- [x] M6 Polish, deploy, publish

## Build log

- **M1 — Scaffold**: Next.js App Router + TypeScript + Tailwind v4 scaffold; landing page linking to placeholder `/onboarding` and `/agent` routes.
- **M2 — Profile schema + prompt compiler**: Zod schemas for `Profile`, `FitAnalysis`, and `ApplicationKit` (`lib/schema.ts`) as the single source of truth; `compileSystemPrompt()` (`lib/compilePrompt.ts`), a pure, snapshot-tested function that renders a profile into the agent's system prompt.
- **M3 — Onboarding wizard**: `/onboarding`, a 5-step wizard (Basics, Targets, Experience, Rules, Review) that assembles a `Profile` and saves it to `localStorage`. Every field is skippable and inherits sensible defaults; nothing is persisted until the final step.
- **M4 — Agent API route + fit analysis**: `app/api/agent/route.ts`, the single server-side entry point for all Anthropic calls — the API key never reaches the client. Validates requests, retries once on invalid JSON with a repair instruction, and returns typed errors. `/agent` runs a real fit analysis (score, matched strengths, gaps, salary check, scam flags).
- **M5 — Application kit + export**: kit generation on `/agent`, gated behind a rendered fit analysis (human-in-the-loop, never optional). Renders CV headline/bullets, cover letter, and an editable recruiter DM with a live character count; copy buttons and a Markdown export.
- **M6 — Polish, deploy, publish**: `/settings` (edit profile — reuses the onboarding wizard rather than duplicating it; export/import profile JSON; clear all data), a responsive pass at 380px, and this build log.

---

*Built with Claude Code. PRD in `/docs`; build log above.*
