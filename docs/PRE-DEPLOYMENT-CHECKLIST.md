# Pre-Deployment Checklist — Application Kit Agent

Complete in order. Don't deploy publicly (i.e. don't share the link on LinkedIn) until all of Section A is done. Section B can happen same-day or right after.

---

## Section A — Must do BEFORE sharing the link publicly

### A1. Rate limiting (protects your personal API billing)
Paste to Claude Code:

> Add basic abuse protection to the /api/agent route before deployment: a simple rate limit (e.g. max N requests per IP per hour, using an in-memory or Vercel KV-based limiter — recommend the simplest approach that works on Vercel's serverless functions) and a hard daily cap on total API calls across all users, returning a friendly "please try again later" message once hit. This protects the maintainer's personal Anthropic billing since there's no auth yet. Keep it simple — this is a stopgap until Phase 3 auth exists, not a production rate-limiting system.

Ask Claude Code to confirm the exact limits it chose (e.g. "10 requests/IP/hour, 200/day total") — write them here once known: ___________

### A2. Set an Anthropic spending cap
Independent of A1, as a hard backstop. In console.anthropic.com → Settings → Billing (or Limits), set a monthly spend cap you're comfortable with even in a worst case (e.g. $10-20). This is a safety net under the rate limiter, not a replacement for it.

### A3. Confirm secrets are clean
Ask Claude Code: "Confirm no API keys, personal profile data, or .env files are committed to git history, not just the current file tree." (History matters — a key deleted from the current file can still exist in an old commit.)

### A4. Deploy to Vercel
1. vercel.com → sign up/sign in with GitHub.
2. "Add New Project" → import ai-job-application-agent.
3. Add Environment Variable: ANTHROPIC_API_KEY = [your key].
4. Deploy. You'll get a live URL like ai-job-application-agent.vercel.app.
5. Test the live URL yourself end-to-end (onboarding → analysis → kit) before sharing it with anyone.

### A5. Enable Vercel Analytics (free, one click)
In the Vercel dashboard for this project → Analytics tab → Enable. Gives you traffic-level visibility (visits, page views) with zero engineering work. This is the only usage visibility you'll have at launch — see Section B for anything deeper.

---

## Section B — Nice to have, can follow shortly after launch

### B1. Custom domain (optional)
If you own or want a cleaner domain than the default .vercel.app one, add it in Vercel's Domains settings. Not required — the default URL works fine for a portfolio link.

### B2. Real usage logging (a deliberate feature, not a quick add)
Vercel Analytics only tells you traffic volume, not "who ran a fit analysis and when." If you want that, it's a scoped build: log timestamp + stage (analysis/kit/extract) + an anonymized session identifier server-side in the /api/agent route — explicitly NOT logging JD content or profile data, to stay consistent with the app's privacy stance. Treat this as its own small milestone, not something to rush before launch.

### B3. LinkedIn launch post
Use the skeleton in docs/BUILD_PLAN.md. Include: the live Vercel link, the GitHub repo link, 2-3 screenshots (recommend: the warm-toned /agent analysis card, and the onboarding wizard). Mention the rate limit exists if you're comfortable — framing it as "built with cost-conscious guardrails since there's no login yet" is itself a good engineering-judgment story.

---

## What "done" looks like
- [ ] A1 rate limiter live and confirmed
- [ ] A2 spend cap set
- [ ] A3 secrets confirmed clean
- [ ] A4 deployed, live URL tested end-to-end
- [ ] A5 Vercel Analytics enabled
- [ ] Ready to share the link publicly
