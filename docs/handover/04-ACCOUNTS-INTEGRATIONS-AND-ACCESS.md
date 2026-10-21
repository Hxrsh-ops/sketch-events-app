# SketchHUB — External Accounts, Integrations & Access Register (`04-ACCOUNTS-INTEGRATIONS-AND-ACCESS.md`)

> **Target Audience:** Harshanth (Outgoing Lead) & Tharika (Incoming Lead)  
> **Purpose:** Comprehensive register of external cloud services, ownership status, and manual delegation steps.  
> **Security Guardrail:** Environment variable names and identifiers are documented without exposing private keys, secrets, or passwords.

---

## 1. Summary Status Matrix

| Integration | Service Role | Current Owner | Handover Action & Current State | Status Rating |
|---|---|---|---|---|
| **GitHub** | Source Control & CI/CD | Harshanth (`@Hxrsh-ops`) | Invite Tharika (`@tharikadheena-ui`) as Admin / Transfer repo | `MANUAL ACTION REQUIRED` |
| **Supabase** | Cloud Database, Auth, Storage | Harshanth (`SKETCHUB` Org) | *User-reported:* Tharika invited to Org. Pending acceptance & verification. | `REPORTED, NOT VERIFIED` |
| **Google Cloud Console** | Google OAuth Credentials | Harshanth Personal GCP | *User-reported:* IAM access granted & added as OAuth test user. Pending verification. | `REPORTED, NOT VERIFIED` |
| **Resend** | Transactional Email API | Harshanth Personal Account | *User-reported:* Tharika invited to Resend team. Pending acceptance & verification. | `REPORTED, NOT VERIFIED` |
| **Brevo** | Fallback Email Adapter | Harshanth Personal Account | Standby adapter in code; optional secondary fallback. | `REPORTED, NOT VERIFIED` |
| **Vercel** | Frontend Web Hosting | Harshanth Personal Account | Invite Tharika to Vercel Team / Transfer project. | `MANUAL ACTION REQUIRED` |
| **Domain & DNS** | Canonical Domain & SSL | Unconfigured / TBD | Register or delegate club domain (e.g. `sketchevents.org`). | `NOT CONFIGURED` |
| **Cron Scheduler** | Periodic Outbox POST Trigger | None / Local only | Configure Upstash QStash or Google Cloud Scheduler. | `NOT CONFIGURED` |
| **Local Supabase / Mailpit** | Local Container Stack | Local Docker WSL2 | Bundled in `supabase/config.toml`; runs completely offline on host. | `VERIFIED` |

---

## 2. Granular Integration Register & Transfer Steps

### 2.1 GitHub Repository
- **Service Name:** GitHub
- **Purpose:** Source code version control, feature branches, pull requests, and automated CI.
- **Repository URL:** `https://github.com/Hxrsh-ops/sketch-events-app`
- **Configuration in Code:** `.git/config`, `.github/workflows/`, `.github/pull_request_template.md`.
- **Environment Variables:** None required for runtime. Optional GitHub Actions secrets (`CRON_SECRET`).
- **Current Account / Owner:** Harshanth (`@Hxrsh-ops`).
- **Target Role for Tharika:** `Admin` (or full Repository Transfer to `@tharikadheena-ui` or an organization account `github.com/sketch-hub`).
- **Transfer vs. Recreation:** **Transfer / Role Grant**. Do not fork or fragment repository history.
- **Manual Steps for Harshanth:**
  1. Open [https://github.com/Hxrsh-ops/sketch-events-app/settings/access](https://github.com/Hxrsh-ops/sketch-events-app/settings/access).
  2. Click **Add people** &rarr; invite `@tharikadheena-ui` with **Admin** permissions.
  3. Under **Branches**, add branch protection rules for `master` and `feat/harshanth-main-development` requiring PR reviews.
- **Verification Test:** Tharika opens the repository settings page and can manage collaborators and branches.
- **Status Rating:** `MANUAL ACTION REQUIRED`

---

### 2.2 Supabase (Cloud Organization & Remote Project)
- **Service Name:** Supabase Cloud
- **Purpose:** Hosted PostgreSQL database, Row Level Security, Supabase Auth engine, and `ticket-assets` storage bucket.
- **Organization Name:** `SKETCHUB` *(historical)*
- **Remote Project Reference ID:** `fvnkhzlbvxemwlkmwhbz` *(historical, region: ap-south-1 Mumbai)*
- **Configuration in Code:** `supabase/config.toml`, `src/lib/supabase/`
- **Environment Variables:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **Current Account / Owner:** Harshanth's personal Supabase account.
- **Recent Update:** *The outgoing owner reports having sent an invitation to `tharikadheena@gmail.com`.*
- **Target Role for Tharika:** `Owner` or `Administrator` in Supabase Organization.
- **Verification Steps for Tharika:**
  1. Check inbox for invitation from Supabase and accept the invite.
  2. Log into [https://supabase.com/dashboard](https://supabase.com/dashboard).
  3. Confirm Organization `SKETCHUB` and project `fvnkhzlbvxemwlkmwhbz` appear in the dashboard.
  4. Verify table access in **Table Editor** (`events`, `registrations`, `admin_profiles`).
- **Status Rating:** `REPORTED, NOT VERIFIED`

---

### 2.3 Google Cloud Platform (OAuth 2.0 Client & IAM)
- **Service Name:** Google Cloud Console
- **Purpose:** Google OAuth login for administrators (`/login` &rarr; Continue with Google).
- **Existing Client ID (from `supabase/config.toml`):**  
  `794333775225-5sdlsol9ch0cu9t14av8dhc2s36hvv6s.apps.googleusercontent.com`
- **Configuration in Code:** `supabase/config.toml` (line 340), `src/app/api/auth/callback/route.ts`.
- **Environment Variables:**
  - `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` (configured in Supabase Dashboard & local env).
- **Current Account / Owner:** Harshanth's personal Google account.
- **Recent Update:** *The outgoing owner reports granting IAM access to `tharikadheena@gmail.com` and adding her as an authorized OAuth test user.*
- **Verification Steps for Tharika:**
  1. Log into [Google Cloud Console](https://console.cloud.google.com/) with `tharikadheena@gmail.com`.
  2. Confirm project access in the top project dropdown.
  3. Navigate to **APIs & Services > OAuth consent screen**; confirm your email is listed under **Test users**.
  4. Navigate to **APIs & Services > Credentials**; inspect the OAuth 2.0 Web Client ID:
     - Verify Authorized JavaScript Origins:
       - `https://fvnkhzlbvxemwlkmwhbz.supabase.co`
       - `http://localhost:3000`
     - Verify Authorized Redirect URIs:
       - `https://fvnkhzlbvxemwlkmwhbz.supabase.co/auth/v1/callback`
       - `http://localhost:3000/api/auth/callback`
- **Status Rating:** `REPORTED, NOT VERIFIED`

---

### 2.4 Resend (Transactional Email Provider)
- **Service Name:** Resend ([https://resend.com](https://resend.com))
- **Purpose:** Production transactional email dispatch (ticket passes, registration confirmations, operational announcements).
- **Configuration in Code:** `src/lib/email/adapters.ts` (`ResendEmailAdapter`).
- **Environment Variables:**
  - `EMAIL_PROVIDER=resend`
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
- **Current Account / Owner:** Harshanth's personal Resend account.
- **Recent Update:** *The outgoing owner reports having sent an invitation to `tharikadheena@gmail.com`.*
- **Verification Steps for Tharika:**
  1. Check inbox for invitation from Resend and accept.
  2. Log into [https://resend.com](https://resend.com).
  3. Check **Domains** tab to see whether the custom club domain has been added or verified.
  4. Generate a new API Key for production use (`sketch-prod-key`) when ready.
- **Status Rating:** `REPORTED, NOT VERIFIED`

---

### 2.5 Brevo (Alternative Email Adapter)
- **Service Name:** Brevo (formerly Sendinblue)
- **Purpose:** Standby secondary transactional email provider.
- **Configuration in Code:** `src/lib/email/adapters.ts` (`BrevoEmailAdapter`), `scripts/test-brevo-isolated.js`.
- **Environment Variables:**
  - `BREVO_API_KEY`
- **Status & Recommendation:** Fully implemented in code. Does not require active maintenance unless Resend failover is needed.
- **Status Rating:** `REPORTED, NOT VERIFIED`

---

### 2.6 Vercel (Hosting & Edge Deployment)
- **Service Name:** Vercel
- **Purpose:** Production Next.js hosting, serverless functions, and SSL termination.
- **Configuration in Code:** Standard Next.js build (`next build`), `.vercel` in `.gitignore`.
- **Environment Variables:** Configured in Vercel Project Settings.
- **Current Account / Owner:** Harshanth personal Vercel account.
- **Target Role for Tharika:** Vercel Team Admin / Project Owner.
- **Manual Steps for Harshanth:**
  1. Open Vercel dashboard &rarr; Project Settings &rarr; Members.
  2. Invite `tharikadheena@gmail.com` as Admin / Project Owner.
- **Status Rating:** `MANUAL ACTION REQUIRED`

---

### 2.7 Automated Cron Scheduler (Outbox Worker)
- **Service Name:** Upstash QStash / Google Cloud Scheduler / GitHub Actions
- **Purpose:** Triggers `POST /api/cron/process-outbox` every 60 seconds with `Authorization: Bearer <CRON_SECRET>`.
- **Configuration in Code:** `src/app/api/cron/process-outbox/route.ts`.
- **Environment Variables:**
  - `CRON_SECRET`
- **Current Account / Owner:** Not yet configured on a dedicated production scheduler.
- **Recommendation:** Set up Upstash QStash (free tier) or a Google Cloud Scheduler job under Tharika's Google Cloud project.
- **Status Rating:** `NOT CONFIGURED`

---

### 2.8 Local Supabase & Mailpit (Containerized Development Stack)
- **Service Name:** Docker Desktop / Supabase CLI / Mailpit
- **Purpose:** Fully isolated, zero-cost, offline-capable local development ecosystem.
- **Configuration in Code:** `supabase/config.toml`, `docker-compose` internal to CLI.
- **Ports:** API (`:54321`), PostgreSQL (`:54322`), Studio (`:54323`), Mailpit (`:54324`).
- **Status:** Fully configured and verified in repository. Runs on any Windows machine with Docker Desktop.
- **Status Rating:** `VERIFIED`

---

Proceed to [**05-ENVIRONMENT-AND-SECRET-MANAGEMENT.md**](./05-ENVIRONMENT-AND-SECRET-MANAGEMENT.md) to inspect variable classification and security rules.
