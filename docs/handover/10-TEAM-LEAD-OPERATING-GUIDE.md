# SketchHUB — Project Lead Operating Guide & AI Workflows (`10-TEAM-LEAD-OPERATING-GUIDE.md`)

> **Target Audience:** Tharika (Incoming Project Lead & Architect)  
> **Purpose:** Practical operating manual for governing the repository, managing contributors, collaborating with AI coding agents (Antigravity), and maintaining software quality.

---

## 1. Day-to-Day Git & Branching Governance

As Project Lead, you are the guardian of the repository. Follow these operational rules to prevent branch regressions:

### 1.1 Branch Strategy
- **`master` Branch**: Represents deployable production code. **Direct pushes to `master` are strictly prohibited.**
- **`feat/harshanth-main-development`**: The current core development branch where Ticket Studio and hardening took place.
- **Feature Branches**: All new work (whether by you, Pragadeesh, or other contributors) must branch off the current base:
  - `feat/feature-name` — New feature work.
  - `fix/bug-description` — Targeted bug fixes.
  - `test/test-name` — Test harness additions.

### 1.2 Protecting Uncommitted Work
Before switching branches, running automated scripts, or prompting AI assistants:
1. Run `git status --short`.
2. If modified files exist that you want to preserve:
   ```powershell
   git stash save "WIP: descriptive note"
   ```
3. Never run `git reset --hard` or `git clean -fd` without inspecting what will be lost.

---

## 2. Reviewing Changes Made by AI Coding Agents (Antigravity / Claude)

AI agents are powerful pair programmers, but they must be governed with discipline:

1. **Inspect Diffs Before Accepting**:
   - Always run `git diff` or review the Git staging view in VS Code before accepting agent edits.
   - Watch out for:
     - Accidental removal of comments, docstrings, or safety checks.
     - Introduction of mock data fallbacks in production files.
     - Unintended changes to `supabase/migrations/` or database schemas.
2. **Never Let an Agent "Fix" a Schema Unilaterally**:
   - If an agent suggests altering a PostgreSQL migration that has already been applied locally or remotely, **reject it**. Database migrations must always be additive (`00009_...sql`), never retroactive edits to existing applied migrations.
3. **Verify Agent Claims with Real Commands**:
   - Never trust an agent when it claims "all tests pass" or "the build succeeded". Run the actual command in your terminal (`npm test`, `npm run build`) and inspect the output.

---

## 3. Keeping Secrets Out of Prompts, Logs, and Commits

- **Zero-Secret Prompting Rule**: Never paste `.env.local` contents, live Supabase service keys, Resend API keys, or Google OAuth client secrets into an AI prompt or chat window.
- **Log Sanitation**: When pasting error traces into chat, ensure authorization headers (`Bearer eyJ...`) and database passwords are redacted.
- **Terminal Hygiene**: When running commands via AI, use environment variable placeholders (e.g. `$env:CRON_SECRET`) rather than echoing raw secret strings into PowerShell history.

---

## 4. Running Focused Tests vs. Full Test Suites

Running all 39 test files takes ~55 seconds and requires local Supabase to prevent connection errors. For rapid development, **always run focused tests** on the file you are modifying:

```powershell
# Run a single focused test file:
npx vitest run src/__tests__/event-actions.test.ts

# Run tests matching a specific keyword:
npx vitest run -t "Rotating QR"

# Run tests in watch mode during development:
npx vitest src/__tests__/registration-persistence.test.ts

# Run the complete test suite only before opening a PR:
npm test
```

---

## 5. Team Subsystem Ownership & Future Onboarding

When onboarding new developers (such as Pragadeesh or new student contributors):

| Subsystem | Primary Owner | Secondary / Reviewer | Boundaries & Rules |
|---|---|---|---|
| **Platform Architecture & DB** | **Tharika** | External Advisor (Harshanth) | All SQL migrations, RLS policies, and RPC definitions must be authored or approved by Tharika. |
| **Public Registration & UI** | **Tharika** | Contributor | Owns `/e/[slug]`, form schemas, and dynamic validators. Must never call email SDKs directly. |
| **Email Infrastructure & Outbox** | **Pragadeesh** | Tharika | Owns `src/lib/email/`, provider adapters, and `/communications`. Must interact with DB solely via `communications_outbox`. |
| **Ticket Studio & QR Check-In** | **Tharika** | Contributor | Owns `/studio`, `/attendance`, and rotating QR verification algorithms. |
| **Production Releases & DevOps** | **Tharika** | Team | Vercel deployments, Supabase migrations, and DNS configuration. |

---

## 6. Escalation Matrix: When to Contact Harshanth

Contact Harshanth (`@Hxrsh-ops`) under the following specific circumstances:
1. **Cloud Account Delegation**: If an invitation to the Supabase Organization (`SKETCHUB`), Google Cloud Project, or GitHub repository fails or requires billing authorization.
2. **Remote Migration History Conflicts**: If `npx supabase migration list --linked` reveals unexpected checksum mismatches or remote database drift that you cannot explain.
3. **Historical Context Gaps**: If an undocumented external club integration, historical event roster, or legacy sponsor requirement arises.

---

## 7. Master Antigravity AI Takeover Prompt

When you start a new coding session with Antigravity, paste the master prompt below to immediately establish project context, safety boundaries, and operating rules:

````markdown
You are Antigravity, pair programming with Tharika (tharikadheena@gmail.com), the Project Lead and Technical Owner of SketchHUB.

Project Context:
- Repository: https://github.com/Hxrsh-ops/sketch-events-app
- Working Branch: feat/harshanth-main-development
- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Radix UI, Supabase (PostgreSQL 17).
- Invariants:
  1. Attendees never get accounts or passwords. Registration is public (/e/[slug]) and passes use bearer links (/tickets/[token]).
  2. Live tickets use 30-second rotating HMAC-SHA256 QR codes with replay protection.
  3. Emails are decoupled via a database outbox (communications_outbox) claimed via FOR UPDATE SKIP LOCKED.
  4. In production mode (APP_MODE=production), mock fallbacks are forbidden. All writes go through database RPCs.
  5. Never paste real secrets, API keys, or service-role credentials into chat, source code, or documentation.

Operating Rules:
- Before modifying code, inspect git status and existing implementations.
- Preserve existing docstrings, comments, and working tests.
- When adding database changes, always create a new numbered migration in supabase/migrations/ (never mutate applied migrations).
- Run focused tests (npx vitest run <file>) to verify changes before suggesting full suite runs.
- Present concise diffs and clear summaries.
````

Proceed to [**11-TRANSFER-AND-CUTOVER-CHECKLIST.md**](./11-TRANSFER-AND-CUTOVER-CHECKLIST.md) to execute the final step-by-step transition checklist.
