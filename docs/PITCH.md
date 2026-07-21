# Job Kit Agent — One-Page Pitch

## The problem

Serious job seekers face a real trade-off: apply broadly and generically, or apply narrowly with real care — but doing the latter well, every time, across dozens of applications, is exhausting. Checking genuine fit, tailoring honestly, catching scam postings, writing outreach that isn't generic — done properly, that's 60-90 minutes per role, and quality drifts as fatigue sets in.

Generic AI tools don't solve this well either: every conversation starts from zero, and nothing stops them from producing confident, generic, occasionally fabricated output with no one checking it before it goes out.

## The idea

Job Kit Agent isn't a tool for applying to more roles faster. It's a tool for applying to fewer roles more carefully. A user onboards once — background, target roles, salary floor, personal rules — and the app compiles that into a personal agent. Every job description then goes through a two-stage process: a fit analysis first, which the user must actually review, and only after that, a tailored application kit built to their own standards.

## The line this deliberately does not cross

This is not a spray-and-apply tool, and it's built to actively resist becoming one:

- Kit generation is architecturally gated behind a reviewed fit analysis — the app will not draft an application without a human checking the assessment first.
- The agent is instructed to only claim facts present in the user's own profile — never invent metrics, titles, or experience.
- Every output carries a visible reminder: AI-drafted, human-reviewed before it goes anywhere. The goal is more care per application, not more applications.

## Why it's more than a wrapper

- The system prompt is the product — a user's own rules become the agent's hard constraints, not suggestions.
- A human checkpoint is a first-class part of the architecture, not an afterthought bolted on.
- Every model response is validated against a strict schema before it reaches the UI — no silent hallucination slipping through.

## What it demonstrates

This project is as much a demonstration of product-and-AI fluency as it is a job-search tool. Every part of the build — from the PRD through six build milestones — was specified like a PM and delegated to an AI coding agent (Claude Code), with the human in the loop at every review point. It's a working example of the same judgment it was built to require of its own users.

## Status

Live, working end-to-end: onboarding, fit analysis, and application kit generation are built and deployed.

Try it: [Live app](https://job-kit-agent-nu.vercel.app/) · [GitHub repo](https://github.com/abhpaul-personal/ai-job-application-agent)

---

*One-pager version 2 — tighten numbers/specifics once usage data exists.*
