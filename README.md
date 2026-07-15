# Application Kit Agent

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

Your profile is stored locally in your browser (exportable as JSON). No accounts, no database, no profile data leaves your machine except inside API calls to Anthropic.

## Privacy note

The repo ships with a fictional demo profile (`config/default-profile.example.json`). Real personal profiles are created at runtime in the browser, or kept in `config/profile.local.json` (gitignored).

## Status

- [x] v0 prototype (Claude artifact, single hardcoded profile)
- [ ] M1 Scaffold
- [ ] M2 Profile schema + prompt compiler
- [ ] M3 Onboarding wizard
- [ ] M4 Fit-analysis agent
- [ ] M5 Application kit generation + export
- [ ] M6 Deploy + screenshots

---

*Built with Claude Code. PRD and build log in `/docs`.*
