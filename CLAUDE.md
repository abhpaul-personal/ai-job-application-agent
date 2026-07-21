# CLAUDE.md — project instructions for Claude Code

## What this project is

Job Kit Agent: a Next.js web app where users onboard once and the app compiles a personalized job-application agent from their profile. Full spec in docs/PRD.md; milestones in docs/BUILD_PLAN.md. This repo is also a public portfolio piece — code quality and README clarity matter as much as function.

## Stack and conventions

- Next.js App Router + TypeScript (strict) + Tailwind CSS. Vitest for unit tests.
- All validation with Zod; schemas live in lib/schema.ts and are the single source of truth.
- All Anthropic API calls happen server-side in app/api/agent/route.ts. Never expose or log the API key. Model: claude-sonnet-4-6.
- Model outputs are JSON-only contracts validated against Zod schemas. One automatic repair retry on invalid JSON, then a typed error.
- compileSystemPrompt() must stay a pure function with snapshot tests. If you change it, update the snapshot deliberately and say why.
- Profile persistence is localStorage only (key: "aka.profile"). No database, no accounts, no analytics on profile content.

## Hard rules

1. Never commit secrets. .env.local and config/profile.local.json are gitignored — keep them so.
2. config/default-profile.example.json must stay fictional/demo data. Real personal data never enters version control.
3. The agent's kit-generation stage must remain gated behind a rendered fit analysis (human-in-the-loop). Do not "optimize" this away.
4. Keep dependencies minimal. Justify any new package in the commit message.
5. Small commits per milestone; conventional messages like "M2: profile schema + prompt compiler".

## Working style

- For architectural milestones (M2–M4), propose a plan before editing files.
- After changes, run the dev server / tests and confirm green before declaring a milestone done.
- The maintainer is a senior PM building fluency with code: explain non-obvious technical decisions in one or two plain sentences in your summaries.
