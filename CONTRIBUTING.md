# SketchHUB — Team Collaboration & Engineering Guide

Welcome to the **SketchHUB** development team! This guide outlines our team structure, Git workflow, quality standards, and subsystem boundaries.

SketchHUB is an admin-first event operations and participant management platform for the SKETCH college club. Our goal is to maintain a dependable, high-quality codebase where multiple engineers can build in parallel without stepping on each other's work.

---

## 1. Team Structure & Subsystem Ownership

| Role | Name | GitHub Username | Ownership & Scope |
| :--- | :--- | :--- | :--- |
| **Project Lead & Technical Lead** | **Harshanth** | `@Hxrsh-ops` | Overall architecture, database schema & migrations, Supabase infrastructure, auth & session rules, integration coordination, PR reviews, CI/CD, and production deployment. |
| **Developer 1** | **Tharika** | `@tharikadheena-ui` | Public participant registration, individual & team registration flows, form validation, capacity checks, participant data contracts, and registration ticket triggers. |
| **Developer 2** | **Pragadeesh** | `@praga104656-maker` | Transactional email infrastructure, provider adapters (Resend-first, Brevo fallback), database-backed outbox queue, bounded retries, email templates, and delivery logging. |

### Core Ownership Principle
Each developer owns a subsystem, but the repository is one integrated product. 
- Subsystem ownership **does not authorize** independent changes to shared database migrations, auth/session rules, or another teammate's business logic.
- Harshanth coordinates cross-subsystem contracts and approves all database schema changes.

---

## 2. Git Workflow & Branching Policy

We use a simple, robust feature-branch workflow. **Direct pushes to `master` are strictly prohibited.**

```mermaid
gitGraph
   commit id: "Initial"
   branch feat/registration-flow
   checkout feat/registration-flow
   commit id: "Add validation"
   commit id: "Wired action"
   checkout master
   branch feat/email-outbox
   checkout feat/email-outbox
   commit id: "Resend adapter"
   checkout master
   merge feat/registration-flow id: "PR #1 (Merged)"
   checkout feat/email-outbox
   merge master id: "Sync master"
   checkout master
   merge feat/email-outbox id: "PR #2 (Merged)"
```

### 2.1 Branch Naming Conventions
Use descriptive, kebab-case branch names prefixed with the change type:
- `feat/<short-description>` — New feature or subsystem implementation (e.g. `feat/team-registration`, `feat/email-outbox-worker`)
- `fix/<short-description>` — Bug fix or correction (e.g. `fix/capacity-boundary-check`)
- `test/<short-description>` — Test additions or test infrastructure improvements (e.g. `test/registration-concurrency`)
- `docs/<short-description>` — Documentation or guide updates (e.g. `docs/api-contracts`)
- `chore/<short-description>` — Dependency or build script adjustments (e.g. `chore/eslint-config`)

### 2.2 Mandatory Step-by-Step Developer Workflow

1. **Start from an up-to-date base branch:**
   ```bash
   git checkout master
   git pull origin master
   ```
2. **Inspect your working tree to ensure no uncommitted artifacts linger:**
   ```bash
   git status
   ```
3. **Create your feature branch:**
   ```bash
   git checkout -b feat/your-subsystem-task
   ```
4. **Make focused, scoped commits:**
   - Keep commits granular and accompanied by descriptive commit messages (e.g. `feat(registration): add server-side team member validation`).
   - Do NOT mix formatting refactors with business logic changes.
5. **Run the local verification suite (all must pass before pushing):**
   ```bash
   npm run lint
   npm run type-check
   npm test
   npm run build
   ```
6. **Push your branch to GitHub:**
   ```bash
   git push -u origin feat/your-subsystem-task
   ```
7. **Open a Pull Request:**
   - Target `master` from your feature branch.
   - Fill out every section of the Pull Request template (`.github/pull_request_template.md`).
   - Paste actual command results from your test run.
8. **Review and Merge:**
   - Automated CI checks will validate lint, type-check, tests, and build.
   - Address any review comments from Harshanth or your teammate.
   - Only merge once required checks pass and the PR receives approval.

---

## 3. Subsystem Boundaries & Integration Contracts

To prevent merge conflicts and runtime race conditions, the boundaries between Tharika's and Pragadeesh's subsystems are explicitly defined:

### 3.1 Registration Subsystem (Tharika)
- **Files Owned:**
  - `src/app/(public)/e/[slug]/page.tsx` (Public registration UI)
  - `src/components/forms/` (`dynamic-form-renderer.tsx`, `registration-form-builder.tsx`)
  - `src/app/(admin)/participants/` (Admin participant management views)
  - `src/app/actions/registration-actions.ts` (Server actions for registration)
- **Integration Boundary:**
  - The registration workflow **never** imports or calls external email SDKs (such as Resend or Brevo) directly.
  - Upon a successful, authoritative registration, the registration action writes an intent record into `communications_outbox` (or calls an agreed enqueue helper).
  - Registration success is **never** reported to the user before the authoritative registration database transaction completes.

### 3.2 Email Infrastructure Subsystem (Pragadeesh)
- **Files Owned:**
  - `src/lib/email/` (Provider adapters, queue processor, email template renderers)
  - `src/app/(admin)/communications/` (Admin email queue/outbox inspection views)
  - `src/app/actions/email-actions.ts` (Email retry/dispatcher server actions)
- **Integration Boundary:**
  - Reads from the durable `communications_outbox` table.
  - Implements safe job claiming (`status = 'processing'`), bounded retries (`max_retries = 3`), exponential backoff, and sanitized logging.
  - Outbox workers must handle crashes gracefully without silently losing jobs or sending duplicate mass emails.

### 3.3 Shared Architecture & Core (Harshanth)
- **Files Owned:**
  - `supabase/migrations/` (PostgreSQL schemas, constraints, RLS policies, RPCs)
  - `src/lib/env.ts` (Environment variable definitions and validation)
  - `src/lib/auth/` (Session verification, role-based access control)
  - `src/lib/supabase/` (Client, server, and repository persistence abstractions)
  - `src/middleware.ts` (Route protection and session refresh)
  - `.github/` (Workflows, templates, codeowners)

---

## 4. Local Development & Environment Setup

SketchHUB is designed to run locally in a self-contained **Preview Mode** without needing real Supabase or Resend credentials.

### Prerequisites
- Node.js `20.x` or `24.x` (LTS recommended)
- npm `10.x` or `11.x`
- Git

### Quick Setup
```bash
# 1. Clone the repository
git clone https://github.com/Hxrsh-ops/sketch-events-app.git
cd sketch-events-app

# 2. Install dependencies reproducibly
npm ci

# 3. Copy example environment
cp .env.example .env.local

# 4. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application in Preview Mode.

### Verification Commands
Before opening any PR, run all four checks locally:
| Command | Purpose |
| :--- | :--- |
| `npm run lint` | ESLint checks across `src/` |
| `npm run type-check` | TypeScript compilation verification (`tsc --noEmit`) |
| `npm test` | Vitest test suite execution |
| `npm run build` | Next.js production build verification |

---

## 5. Security & Privacy Rules

1. **Zero Secrets in Git:**
   - Never commit `.env.local` or any file containing real API keys, Supabase service-role keys, or email provider credentials.
   - Use `.env.example` with placeholders only.
2. **Private Context Isolation:**
   - The private specification documents located in `context/` are strictly private to Harshanth and are ignored by Git. Never track, stage, or push them.
3. **No Unapproved Real Emails:**
   - Do not trigger real emails to real participants or test addresses without explicit written approval from Harshanth.
   - All automated tests must use mock email adapters.
4. **No Destructive Database Commands:**
   - Never run `DROP TABLE` or destructive SQL scripts against shared databases.
   - All migrations must be backwards-compatible and approved by Harshanth.

---

## 6. Getting Help & Reporting Blockers

If you encounter an architectural ambiguity, a failing test you did not write, or a merge conflict across subsystem boundaries:
1. **Stop** before making unilateral changes to shared files.
2. Document the exact issue and steps to reproduce.
3. Ping Harshanth (`@Hxrsh-ops`) on GitHub or open an issue using the Technical Investigation template.
