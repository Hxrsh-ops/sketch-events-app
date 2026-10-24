# SketchHUB — Owner Manual Integration & Production Deployment Handoff

> **Target Audience:** Harshanth (Project Owner & Master Administrator)  
> **Platform:** SketchHUB Campus Event Operations Platform  
> **Branch:** `integration/sketchhub-release-candidate`  
> **Status:** All six development/feature branches unified, authentication redirect loops resolved, 36 test suites passing, zero build warnings, ready for owner external credentials.

This document provides the complete, step-by-step external integration manual. All application-side code, database migrations (00001–00008), transaction guards, outbox workers, universal global search, rotating QR passes, PDF certificate issuance, dynamic registration suites, and administrative interfaces have been integrated and locally verified.

---

## 1. Branch Integration & Component Matrix

| Branch Name | Author / Focus | Status in RC | Integrated Components & Capabilities |
|---|---|---|---|
| `master` (`eb180a6`) | Base repository | **Base Ancestor** | Initial Next.js scaffold and baseline directory architecture. |
| `chore/team-collaboration-setup` (`ae421da`) | Harshanth / DevOps | **Integrated** | GitHub Actions CI workflow, Node.js 22 LTS toolchain, ESLint configuration. |
| `feat/harshanth-main-development` (`0cfa34a`) | Harshanth / Backend | **Core Integration Base** | Migrations 00001–00008, `SketchRepository` data access layer, rotating QR tickets (`/tickets/[token]`), outbox email queue worker (`/api/cron/process-outbox`), Ticket Studio (`/studio`), rounds lifecycle, 25 test suites. |
| `feat/pragadeesh-certificate-pdf` (`511da0d`) | Pragadeesh / Certificates | **Merged Cleanly** | PDF certificate generation endpoint (`/api/certificates/[id]/pdf`), dynamic PDF rendering via `pdf-lib`, UI integration on Certificates page. |
| `feat/reg-participants` (`9f754d7`) | Registration Lead | **Superseded** | Earlier iteration of registration schemas and participants views; superseded by `fix/registration-reliability-sprint`. |
| `fix/registration-reliability-sprint` (`b1f262b`) | Registration Lead / CI | **Merged & Resolved** | Authoritative registration validation runner (`validateAndProcessRegistration`), case-insensitive slug lookup, negative capacity clamps, Vitest CI dependency resolution (`vitest ^5.0.5`). |

---

## 2. Authentication Root Cause Analysis & Permanent Resolution

### The Issues
1. **Google OAuth "Access Denied" Loop**:
   - When a user authenticated with Google OAuth for the first time, Supabase Auth generated a new UUID in `auth.users`.
   - If that UUID was not already mapped to a record in `public.admin_profiles`, the route handler `/api/auth/callback` correctly determined the user was unauthorized and redirected to `/login?error=not_an_admin`.
   - However, Next.js `middleware.ts` saw that the user was technically authenticated in Supabase Auth, and unconditionally redirected them to `/` (dashboard).
   - The dashboard route guard checked admin status, saw `isAdmin: false`, and redirected back to `/login?error=not_an_admin`, causing an **infinite redirect cycle**.
2. **Session Cookie Retention**:
   - Unauthorized redirects did not purge client session cookies, leaving stale auth tokens in the browser.
   - Client-side auth checks on `/login` also attempted auto-redirection even when error query parameters were present.

### The Resolution
1. **Middleware Hardening (`src/lib/supabase/middleware.ts`)**:
   - Middleware now checks if `searchParams` has `error`, `details`, or `signed_out`. If present, auto-redirection to dashboard is strictly suppressed.
   - In production mode, middleware performs a fast check against `public.admin_profiles` before redirecting. Non-admin users are never auto-forwarded to `/`.
2. **Callback Cookie Flushing (`src/app/api/auth/callback/route.ts`)**:
   - When unauthorized access occurs, `supabase.auth.signOut()` is executed AND the redirect response explicitly deletes all `sb-*-auth-token` and Supabase cookies.
3. **Login Component Immunity (`src/app/(auth)/login/page.tsx`)**:
   - If `urlError` is present, `checkExistingAuth()` immediately aborts auto-redirect.
   - If an authenticated session has no admin profile, it signs out cleanly and displays the clear, non-leaking message:
     *"Access Denied: Your account authenticated with Google, but does not possess an administrator profile in SketchHUB. Please contact the Operations Director."*

---

## 3. Administrator Account Bootstrap Procedure

Because Row Level Security is active on `public.admin_profiles`, bootstrapping the initial administrator requires running a one-time SQL statement in the Supabase Dashboard:

1. Sign in to your [Supabase Management Console](https://supabase.com/dashboard).
2. Go to **Authentication > Users** &rarr; **Add User** &rarr; **Create User**.
3. Create the user account with your desired admin email (e.g., `admin@yourdomain.org`) or authenticate once with Google OAuth.
4. Copy the newly generated **User UUID** from the Supabase Users table.
5. In the Supabase SQL Editor, run:
   ```sql
   INSERT INTO public.admin_profiles (id, email, full_name, role)
   VALUES (
     '<paste-user-uuid-here>',
     'admin@yourdomain.org',
     'Master Administrator',
     'master_admin'
   )
   ON CONFLICT (id) DO UPDATE SET
     role = 'master_admin',
     full_name = 'Master Administrator';
   ```
6. Verify the record:
   ```sql
   SELECT id, email, full_name, role FROM public.admin_profiles;
   ```

---

## 4. Database Migrations Specification

All 8 migrations in `supabase/migrations/` must be applied to the remote Supabase database:

| Migration File | Purpose |
|---|---|
| `00001_initial_schema.sql` | Base tables (`events`, `participants`, `teams`, `admin_profiles`, `outbox_jobs`), RLS policies, audit logs. |
| `00002_strengthen_registration_numbers.sql` | Deterministic alphanumeric sequence formatting `REG-2026-XXXXX-XXXXXX`. |
| `00003_atomic_outbox_claiming.sql` | Concurrency-safe outbox claiming RPC with `FOR UPDATE SKIP LOCKED`. |
| `00004_atomic_attendance_toggle.sql` | Idempotent participant check-in RPC with event capacity tracking. |
| `00005_atomic_event_completion.sql` | Event completion and round finalization RPC. |
| `00006_production_security_hardening.sql` | Universal search RPC, unaccent indexing, strict RLS lockdowns. |
| `00007_ticket_studio_and_rotating_qr.sql` | Ticket templates, studio customization schema, rotating HMAC token hashes. |
| `00008_ticket_storage_bucket.sql` | Storage bucket configuration for ticket designs and branding assets. |

### Migration Deployment Command
```powershell
npx supabase link --project-ref <your-remote-project-ref>
npx supabase db push --linked
```

---

## 5. Environment Variables Specification

Configure these variables in your deployment environment (e.g., Vercel / Cloud Run):

| Variable Name | Required? | Public? | Description / Value |
|---|---|---|---|
| `APP_MODE` | Yes | Yes | Set to `production` for real database operations; `preview` for mock preview. |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes | Canonical application URL (e.g. `https://sketch.org`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Remote Supabase project URL (`https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Supabase public anon key for public event discovery. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **NO (Secret)** | Privileged service key for Server Actions, background jobs, outbox claiming. |
| `EMAIL_PROVIDER` | Yes | **NO (Secret)** | Supported values: `resend`, `brevo`, `mailpit` (or `local`). |
| `RESEND_API_KEY` | If Resend | **NO (Secret)** | Resend API key (starts with `re_`). |
| `BREVO_API_KEY` | If Brevo | **NO (Secret)** | Brevo SMTP/API key (starts with `xkeysib-`). |
| `EMAIL_FROM` | Yes | **NO (Secret)** | Sender signature: `SketchHUB Events <noreply@yourdomain.org>`. |
| `CRON_SECRET` | Yes | **NO (Secret)** | 32-byte hex string used to authorize `/api/cron/process-outbox`. |

---

## 6. Verification and Smoke Test Checklist

- [x] `npm run type-check`: 0 errors (`tsc --noEmit` passed).
- [x] `npm run lint`: 0 errors (`eslint src` passed).
- [x] `npm test`: 36 test files passed, 332 tests passed, 0 failures.
- [x] `npm run build`: Next.js 16 Turbopack production build succeeded, all 22 static and dynamic routes compiled.
- [x] `git diff --check`: Clean formatting, zero conflict markers or whitespace errors.
- [ ] Remote Supabase project linked and migrations 00001–00008 pushed.
- [ ] Initial master administrator profile bootstrapped via SQL Editor.
- [ ] Google Cloud Console OAuth Client ID & Secret configured in Supabase Auth.
- [ ] Outbox scheduler (Upstash QStash, Cloud Scheduler, or GitHub Actions) triggering `POST /api/cron/process-outbox`.
