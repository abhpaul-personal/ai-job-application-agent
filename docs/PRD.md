# PRD — AI Job Application Agent

Owner: Abhijit Paul · Status: v1.0 · Last updated: 2026-07-15

## 1. Problem

Serious job seekers run a repeatable pipeline per application: alignment check → CV tailoring → cover letter → recruiter outreach → scam screening. Done manually this takes 60–90 minutes per role and quality drifts. Generic AI tools don't know the candidate's rules (how to frame experience, salary floor, format conventions), so their output needs heavy rework.

## 2. Solution

A web app where a user onboards once, and the app compiles a personalized application agent from their profile. Per application, the agent runs a two-stage loop: fit analysis (human reviews) → application kit generation.

## 3. Users

- Primary: mid/senior professionals in active search running many concurrent processes.
- Secondary: viewers of the repo (recruiters, hiring managers) evaluating the builder's product and agent-design thinking. The repo itself is a portfolio artifact.

## 4. User journey

### 4.1 Onboarding wizard (first run, ~4 minutes)

Step 1 — Basics: name, current title, current company, location, notice period, current CTC, expected CTC range (min = the agent's salary floor). Every field skippable; skipped fields inherit defaults from the default profile.

Step 2 — Targets: role types (multi-select + free text, e.g. Senior PM, Principal TPM), seniority band, industries, work mode (onsite/hybrid/remote), relocation preference.

Step 3 — Experience: EITHER paste base CV as text, OR answer 4 guided prompts ("Your strongest 0-to-1 story?", "A program you ran at scale?", "A compliance/quality win?", "Your biggest cross-functional delivery?"). An AI call converts either input into a structured story bank: [{name, one_liner, metrics, themes}].

Step 4 — Rules: free-text list of hard constraints the agent must never violate (framing rules, wording rules, format rules). Prefilled from default profile; user edits.

Step 5 — Review & compile: show the assembled profile JSON and a preview of the compiled system prompt. Button: "Create my agent."

### 4.2 Main loop (per application)

1. Paste JD (+ optional recruiter contact / comp info). Select track if user has multiple role types.
2. Stage 1 — Fit analysis: fit score 0–100, verdict, matched strengths each mapped to a story-bank item, honest gaps, salary check vs floor, scam flags (generic email domains for senior roles, chat-app-first recruitment, fee requests, careers-page absence).
3. Human checkpoint: user reviews; may edit analysis notes.
4. Stage 2 — Application kit: CV positioning headline, 5 metric-led bullets, cover letter in the user's chosen format, recruiter DM under 300 chars with live character count.
5. Export: copy buttons per section; download kit as Markdown.

### 4.3 Settings

Edit profile (re-runs compilation), export/import profile JSON, clear all data.

## 5. Functional requirements

- FR1 Profile schema validated with Zod; single source of truth in /lib/schema.ts.
- FR2 compileSystemPrompt(profile) is a pure, unit-tested function. Deterministic: same profile in, same prompt out.
- FR3 All model calls go through one server-side API route (/api/agent); the Anthropic key lives only in server env vars.
- FR4 Model responses must be JSON conforming to per-stage schemas; invalid JSON triggers one automatic retry with a repair instruction, then a user-facing error.
- FR5 Profile persists in localStorage; export/import as JSON file.
- FR6 Kit generation is blocked until the user has viewed the fit analysis (HITL enforced in UI state).
- FR7 Default profile loads from config/default-profile.example.json; a gitignored config/profile.local.json overrides it if present (for the maintainer's personal defaults).

## 6. Non-functional

- No accounts, no database in v1. No analytics that capture profile content.
- Works on mobile widths (recruiters will open the LinkedIn link on phones).
- Total cost per application run < ₹5 at Sonnet pricing (cap max_tokens per stage).

## 7. Out of scope (v1)

File upload/parsing of .docx CVs (paste text instead) · auto-apply / browser automation · multi-user accounts · saved application history.

## 8. Success criteria

- Maintainer replaces his manual per-application workflow with the app for ≥5 real applications.
- Repo README communicates the agent-design patterns clearly enough to discuss in an interview without opening the code.
- Deployed demo link + 90-second Loom in the LinkedIn post.

## 9. Risks

- Prompt bloat as profiles grow → compiler enforces a token budget, truncates story bank to top 8 stories.
- Hallucinated claims in kit output → system prompt hard rule: "Only claim facts present in the profile"; kit UI shows a "verify before sending" notice.
- Users pasting confidential JDs → privacy note in footer; nothing stored server-side.
