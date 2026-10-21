# SketchHUB — Environment Configuration & Secret Management Guide (`05-ENVIRONMENT-AND-SECRET-MANAGEMENT.md`)

> **Target Audience:** Tharika (Project Lead) & DevOps Engineers  
> **Security Guardrail:** STRICT ZERO-SECRET TOLERANCE. Never commit real keys, hashes, or passwords to Git. All examples in this document use explicit placeholders.

---

## 1. Master Environment Variable Classification

The SketchHUB architecture enforces a strict compile-time boundary between **public client configuration** (`NEXT_PUBLIC_*` evaluated in `src/lib/env.ts`) and **privileged server secrets** (`src/lib/env.server.ts` protected by `import "server-only"`).

| Variable Name | Sensitivity | Scope | Where Required | Default / Format | Purpose |
|---|---|---|---|---|---|
| `APP_MODE` (or `NEXT_PUBLIC_APP_MODE`) | Public | Client & Server | Local, Staging, Prod | `preview` or `production` | Switches between offline mock fallback and real Supabase database. |
| `NEXT_PUBLIC_APP_URL` | Public | Client & Server | Local, Staging, Prod | `http://localhost:3000` | Canonical origin for redirects, OAuth callbacks, and ticket links. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Client & Server | Prod (Optional Local) | `https://<project-ref>.supabase.co` | Supabase API Gateway endpoint. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Client & Server | Prod (Optional Local) | High-entropy JWT token | Anon public key for unauthenticated reads of published events. |
| `SUPABASE_SERVICE_ROLE_KEY` | **CRITICAL SECRET** | Server-Only | Staging, Prod, Local Prod | High-entropy JWT token | Bypasses RLS for Server Actions, background outbox claiming, and admin tasks. |
| `EMAIL_PROVIDER` | Low Risk | Server-Only | Local, Staging, Prod | `resend`, `brevo`, `mailpit`, `test` | Selects the active transactional email adapter. |
| `RESEND_API_KEY` | **SENSITIVE SECRET** | Server-Only | Staging, Prod (if Resend) | Starts with `re_...` | API key to authenticate outbound dispatch with Resend. |
| `BREVO_API_KEY` | **SENSITIVE SECRET** | Server-Only | Staging, Prod (if Brevo) | Starts with `xkeysib-...` | API key to authenticate outbound dispatch with Brevo. |
| `EMAIL_FROM` | Low Risk | Server-Only | Staging, Prod | `"Name <email@domain>"` | Verified sender identity displayed in participant inboxes. |
| `MAILPIT_URL` | Low Risk | Server-Only | Local Dev Only | `http://127.0.0.1:54324` | Local Mailpit REST endpoint for local email capture. |
| `STORAGE_DRIVER` | Low Risk | Server-Only | Local, Staging, Prod | `supabase` or `local` | Directs ticket assets to Supabase Storage bucket `ticket-assets` or local disk. |
| `CRON_SECRET` | **SENSITIVE SECRET** | Server-Only | Staging, Prod | 32-byte hex string | Shared bearer secret securing `POST /api/cron/process-outbox`. |
| `SESSION_SECRET` | **SENSITIVE SECRET** | Server-Only | Optional (Local dev) | 32-character string | HMAC secret used to sign local preview development cookies. |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | **CRITICAL SECRET** | Supabase Only | Local, Staging, Prod | Google OAuth Secret | Client secret configured in Supabase Auth Google provider. |

---

## 2. Environment Transfer Plan & Matrix (Phase 7 Specification)

To ensure secure, decentralized handover without sharing personal passwords or pasting secrets into AI prompts, use this exact transfer method for each variable:

| Environment Variable | Production Purpose | Tharika's Acquisition Method | Recommended Channel / Tool |
|---|---|---|---|
| `APP_MODE` | Runtime mode switch | **Set locally** (`production` or `preview`) | No secret sharing needed. |
| `NEXT_PUBLIC_APP_URL` | Canonical URL | **Set locally** (`http://localhost:3000`) or from Vercel domain | Team documentation. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API endpoint | **Obtain from Supabase Dashboard** (Project Settings > API) | Log into Supabase with `tharikadheena@gmail.com`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | **Obtain from Supabase Dashboard** (Project Settings > API) | Log into Supabase with `tharikadheena@gmail.com`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key | **Obtain from Supabase Dashboard** (Project Settings > API) | Log into Supabase with `tharikadheena@gmail.com`. *(Do not share via chat)* |
| `EMAIL_PROVIDER` | Adapter selector | **Set locally** (`mailpit`) / **Staging/Prod** (`resend`) | Standard config. |
| `RESEND_API_KEY` | Outbound email auth | **Generate independently** in Resend Dashboard | Log into Resend team account & create new API key. |
| `BREVO_API_KEY` | Fallback email auth | **Leave unset** unless active Brevo fallback is desired | Optional. |
| `EMAIL_FROM` | Sender display identity | **Configure based on verified domain** (e.g. `SketchHUB <noreply@sketch.org>`) | Team agreement. |
| `MAILPIT_URL` | Local email capture | **Generate locally** (defaults to `http://127.0.0.1:54324`) | Built into local Supabase. |
| `STORAGE_DRIVER` | Ticket asset storage | **Set to `supabase`** (or `local` for offline testing) | Standard config. |
| `CRON_SECRET` | Outbox worker security | **Generate new 32-byte hex string** | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Set in Vercel & QStash. |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | Google OAuth client secret | **Obtain from Google Cloud Console** (Credentials > Web Client) | Log into GCP Console with `tharikadheena@gmail.com`. |

> [!IMPORTANT]
> **Preferred Pattern: Account Delegation Over Credential Sharing**  
> Notice that by granting Tharika team/admin access to Supabase, Google Cloud, and Resend, **Harshanth does not need to copy-paste raw passwords or keys**. Tharika can directly read or generate her own API keys from the provider dashboards. This is dramatically safer than transmitting secrets across messaging apps.

---

## 3. Environment Requirement Matrix by Environment

| Variable Name | Local (Preview Mode) | Local (Docker Supabase) | Staging Environment | Production Live |
|---|---|---|---|---|
| `APP_MODE` | `preview` | `production` | `production` | `production` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `http://localhost:3000` | Staging domain | `https://sketch.yourdomain.org` |
| `NEXT_PUBLIC_SUPABASE_URL` | *Omitted* | `http://127.0.0.1:54321` | Remote Project URL | Remote Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Omitted* | Local Anon Key | Staging Anon Key | Production Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | *Omitted* | Local Service Role Key | Staging Service Key | Production Service Key |
| `EMAIL_PROVIDER` | `test` or `mailpit` | `mailpit` | `resend` (test domain) | `resend` |
| `RESEND_API_KEY` | *Omitted* | *Omitted* | Staging API Key | Production Live Key |
| `EMAIL_FROM` | *Default used* | Local placeholder | Staging sender | Verified production domain |
| `STORAGE_DRIVER` | `local` | `supabase` | `supabase` | `supabase` |
| `CRON_SECRET` | *Omitted* | Local dummy token | Staging token | Random 32-byte hex secret |

---

## 4. Git Leak Prevention & Verification

The project `.gitignore` explicitly excludes local environment files:
```gitignore
# local env files
.env*.local
.env
!.env.example
```

### Mandatory Git Secret Check Before Any Commit
Before staging or committing any code, run this verification command:

```powershell
# 1. Verify that .env and .env.local are ignored by git:
git check-ignore -v .env .env.local

# Expected output:
# .gitignore:28:.env    .env
# .gitignore:27:.env*.local     .env.local

# 2. Check git status to ensure no .env files appear as untracked:
git status --short | Select-String "\.env"
# Should ONLY show modified .env.example (if updated intentionally)
```

---

## 5. Separation of Local, Staging, and Production Config

- **Local Machine**: Always store environment variables in `.env.local` on your local laptop. This file is git-ignored and never committed.
- **Staging / CI**: Configure environment variables in GitHub Actions Secrets or Staging hosting provider settings.
- **Production (Vercel / Cloud Run)**: Add variables directly in the hosting provider's **Project Settings > Environment Variables** dashboard. Restrict sensitive variables (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`) to the **Production** environment scope only.

---

## 6. Credential Rotation Procedures

If any key or token is suspected of being exposed:

1. **Supabase Service Role Key**:
   - Go to Supabase Dashboard &rarr; **Project Settings > API > JWT Settings**.
   - Click **Generate new JWT Secret** (Note: this invalidates all existing active admin sessions and service keys).
   - Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel settings and redeploy.
2. **Resend API Key**:
   - Go to Resend Dashboard &rarr; **API Keys**.
   - Create a new API Key: `sketch-prod-resend-v2`.
   - Update `RESEND_API_KEY` in Vercel settings.
   - Delete the old compromised API key from the Resend dashboard.
3. **Cron Secret**:
   - Generate a new 32-byte hex string.
   - Update `CRON_SECRET` in Vercel settings and in the automated scheduler (Upstash QStash / Cloud Scheduler).

Proceed to [**06-SUPABASE-DATABASE-AND-MIGRATIONS.md**](./06-SUPABASE-DATABASE-AND-MIGRATIONS.md) to inspect the Supabase database migrations and storage configuration.
