# SketchHUB — Owner Manual Integration & Production Deployment Handoff

> **Target Audience:** Harshanth (Project Owner & Master Administrator)  
> **Platform:** SketchHUB Campus Event Operations Platform  
> **Status:** Application code complete, locally verified, ready for owner external credentials.

This document provides the complete, step-by-step external integration manual. All application-side code, database migrations (00001–00006), transaction guards, outbox workers, universal global search, temporary administrator credentials, and administrative interfaces have been implemented and locally tested. The steps below detail the owner-controlled configurations required to transition from local verification to production live operation.

---

## 1. External Integration Status Matrix

| Integration | Code Status | Owner Action | Exact Verification |
|---|---|---|---|
| **Local Supabase** | **Verified** | None needed (Local Docker stack active on port 54321 API, port 54322 PostgreSQL, port 54324 Mailpit). Host Windows PostgreSQL on 5432 remains completely isolated and untouched. | `npm test` runs 25 test files (222 tests) against live database |
| **Remote/Production Supabase** | **Ready** | Create remote Supabase project, link CLI, and push migrations | `npx supabase db push --linked` applies migrations 00001–00006 |
| **Admin Account / Bootstrap** | **Ready** | Create user in Supabase Auth, insert profile row into `public.admin_profiles` via SQL Editor | Sign in to dashboard and verify "master_admin" badge in topbar |
| **Temporary Admin (Preview)** | **Implemented** | Enabled in preview/dev (`SKETCHADMIN` / `SKETCHHUB2026`); automatically locked in production | Verify server returns 403 Forbidden on preview login when `APP_MODE=production` |
| **Google OAuth** | **Ready** | Configure Google Cloud Console OAuth Client & Supabase Auth Provider & Supabase URL Configuration | Click "Continue with Google" on login page and verify redirect to `/` |
| **Email Provider (Resend/Brevo)** | **Ready** | Create provider account, configure API key, verify sending domain | Register attendee; verify outbox job status becomes "sent" |
| **Sender Domain (DNS)** | **Ready** | Add MX, SPF, and DKIM DNS records for your domain | Send test email via provider dashboard to confirm verified status |
| **Outbox Scheduler (Cron)** | **Ready** | Configure periodic HTTP POST trigger to `/api/cron/process-outbox` with Bearer token | Trigger endpoint with Bearer token; receive HTTP 200 with batch stats |
| **Hosting & Deployment** | **Ready** | Deploy Next.js repository to Vercel or Cloud Run | Run production smoke tests on public domain |
| **Monitoring & Health** | **Ready** | Enable Vercel / Cloud logging and Supabase database metrics | View telemetry on provider dashboards |

---

## 2. Environment Variables Specification

The platform strictly differentiates between client-safe public variables (`NEXT_PUBLIC_*`) and server-only secrets. Privileged keys are enforced at build-time via Next.js `server-only`.

| Variable Name | Required? | Scope | Origin | Public? | Consuming Integration | Verification Method |
|---|---|---|---|---|---|---|
| `APP_MODE` (or `NEXT_PUBLIC_APP_MODE`) | Required | Local & Prod | Environment config | Yes | Platform runtime mode switch | Set to `production` for real DB; `preview` for mock data |
| `NEXT_PUBLIC_APP_URL` | Required | Local & Prod | Hosting URL | Yes | Canonical links, redirects, passes | Must match deployed domain (e.g., `https://sketch.org`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Required in Prod | Local & Prod | Supabase Project Settings | Yes | Supabase client & API gateway | Ping `/rest/v1/` returns Swagger OpenAPI definition |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required in Prod | Local & Prod | Supabase API Keys | Yes | Public reads for published events | Anon client can read published events; blocked on RPCs |
| `SUPABASE_SERVICE_ROLE_KEY` | Required in Prod | Server-only | Supabase API Keys | **NO (Secret)** | Server Actions, Outbox Worker, RPCs | Server Actions can claim outbox & toggle attendance |
| `EMAIL_PROVIDER` | Required in Prod | Server-only | Provider choice | **NO (Secret)** | Email engine adapter factory | Values: `resend` (default), `brevo`, `mailpit` (or `local`), `test` |
| `RESEND_API_KEY` | If using Resend | Server-only | Resend Dashboard > API Keys | **NO (Secret)** | Resend email dispatch adapter | Valid key starts with `re_` |
| `BREVO_API_KEY` | If using Brevo | Server-only | Brevo Dashboard > SMTP & API | **NO (Secret)** | Brevo email dispatch adapter | Valid key starts with `xkeysib-` |
| `EMAIL_FROM` | Required in Prod | Server-only | Verified Sender Domain | **NO (Secret)** | Ticket and certificate emails | Format: `SketchHUB <noreply@yourdomain.org>` |
| `MAILPIT_URL` | Optional (Local dev) | Server-only | Local Supabase config | **NO (Secret)** | Mailpit local email capture | Default: `http://127.0.0.1:54324` |
| `CRON_SECRET` | Required in Prod | Server-only | Random 32-byte hex string | **NO (Secret)** | Background outbox cron security | Calling `/api/cron/process-outbox` without token gives 401 |
| `TEMPORARY_ADMIN_ENABLED` | Optional (Local dev) | Server-only | Dev toggle | **NO** | Disables preview temporary credentials | In production, disabled automatically by runtime check |

---

## 3. Step-by-Step Owner Setup Procedure

Follow these phases in sequential order:

### Phase 1: Remote Supabase Project Setup
1. Log in to [Supabase Management Console](https://supabase.com/dashboard).
2. Click **New Project**, choose your organization, name it `sketch-events-production`, set a strong database password, and select your preferred region.
3. Once provisioned, navigate to **Project Settings > API**:
   - Copy **Project URL** &rarr; use for `NEXT_PUBLIC_SUPABASE_URL`.
   - Copy **anon public key** &rarr; use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Copy **service_role secret key** &rarr; use for `SUPABASE_SERVICE_ROLE_KEY`.
4. Apply the project migrations to the remote database from your local machine:
   ```powershell
   # Authenticate Supabase CLI
   npx supabase login

   # Link local repository to your remote project (found in Project Settings > General > Reference ID)
   npx supabase link --project-ref <your-project-ref>

   # Push all 6 migrations to remote database
   npx supabase db push --linked
   ```
5. Confirm that all 6 migrations applied cleanly:
   ```powershell
   npx supabase migration list --linked
   ```

   **Verified Migration Checksums (SHA-256):**
   | Migration File | SHA-256 Checksum | Purpose |
   |---|---|---|
   | `00001_initial_schema.sql` | `00e920ce3c32f6cb0630de150fc169d1f70c7aaaae890c9133097416301ef6b6` | Base schema, RLS, events, participants, teams, outbox (qualified `extensions.uuid_generate_v4()`) |
   | `00002_strengthen_registration_numbers.sql` | `2a500f955316652a0710e3cbb41de13beb098f84c8ec34c5ef4b207b98f07bd0` | Registration sequence formatting `REG-2026-XXXXX-XXXXXX` |
   | `00003_atomic_outbox_claiming.sql` | `21ca5afe5ff8488846a187f3b81e4496b2ba35e12b43a1b3f1dec893c47a522e` | Outbox claiming RPC with `FOR UPDATE SKIP LOCKED` |
   | `00004_atomic_attendance_toggle.sql` | `4f6b378ed4b0a162aee0cc8836282941c985817a4ac0b7f5f114d4cd7e92917c` | Idempotent attendance toggle RPC with event capacity tracking |
   | `00005_atomic_event_completion.sql` | `fa710d68f9597d9a66e79461bc1b8bd101908956ae03e329bb8e21b04276e7b2` | Event completion RPC with round finalization |
   | `00006_production_security_hardening.sql` | `a3fa33c09003832fc89f03035779b28a71d93974b98bd744151c33bd19c7f155` | Search function security, unaccent, RLS lockdown |

   > [!NOTE]
   > Local and remote databases are strictly isolated. The local database runs inside Docker on port `54322`, while native Windows PostgreSQL on port `5432` is never touched.

---

### Phase 2: Administrator Account Bootstrap
Row Level Security is enabled on `public.admin_profiles`, and all direct SELECT/INSERT/UPDATE permissions are revoked from `anon` and unprivileged roles. Therefore, bootstrapping the initial super administrator MUST be performed using the Supabase Dashboard SQL Editor (which runs with superuser privileges) or via the Supabase Service Role Key:

1. In your Supabase Dashboard, go to **Authentication > Users** and click **Add User** &rarr; **Create User**.
2. Enter your master administrator email (e.g., `admin@yourdomain.org`) and a strong temporary password.
3. Copy the generated **User UID** (UUID format).
4. Go to **SQL Editor > New Query** and execute the following bootstrap statement:
   ```sql
   INSERT INTO public.admin_profiles (id, email, full_name, role)
   VALUES (
     '<paste-user-uuid-here>',
     'admin@yourdomain.org',
     'Harshanth',
     'master_admin'
   )
   ON CONFLICT (id) DO UPDATE SET
     role = 'master_admin',
     full_name = 'Harshanth';
   ```
5. Verify that the administrator record exists:
   ```sql
   SELECT id, email, full_name, role FROM public.admin_profiles;
   ```

---

### Phase 3: Google OAuth Configuration
The Google OAuth flow requires a coordinated two-tier configuration:
1. Google Cloud Console authenticates the user and redirects to Supabase Auth (`https://<project-ref>.supabase.co/auth/v1/callback`).
2. Supabase Auth processes the credentials and redirects to the SketchHUB application callback (`https://<your-domain>/api/auth/callback`).
3. Next.js Route Handler `/api/auth/callback` verifies that the user ID exists in `public.admin_profiles`. If not found, it signs the user out immediately and redirects to `/login?error=not_an_admin`.

#### Step A: Google Cloud Console
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select your project (e.g., `sketch-hub-auth`).
3. Navigate to **APIs & Services > OAuth consent screen**:
   - Choose **External** user type.
   - App Name: `SketchHUB Events`
   - User support email: your admin email.
   - Developer contact email: your admin email.
   - Add scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`.
4. Navigate to **Credentials > Create Credentials > OAuth Client ID**:
   - Application type: **Web application**.
   - Name: `SketchHUB Web Client`.
   - **Authorized JavaScript origins**:
     - `https://<your-project-ref>.supabase.co`
     - `https://your-production-domain.com` (your production URL)
   - **Authorized redirect URIs**:
     - `https://<your-project-ref>.supabase.co/auth/v1/callback`
5. Copy the generated **Client ID** and **Client Secret**.

#### Step B: Supabase Auth Provider
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) &rarr; **Authentication > Providers > Google**:
   - Toggle **Enable Google provider** to ON.
   - Paste **Client ID**.
   - Paste **Client Secret**.
   - Save changes.

#### Step C: Supabase URL Configuration (CRITICAL)
1. In [Supabase Dashboard](https://supabase.com/dashboard), navigate to **Authentication > URL Configuration**:
   - **Site URL**: `https://your-production-domain.com` (or `http://localhost:3000` for local testing).
   - **Redirect URLs (Allow list)**:
     - `https://your-production-domain.com/api/auth/callback`
     - `https://your-production-domain.com/**`
     - `http://localhost:3000/api/auth/callback` (if testing locally)
   - Save changes.

---

### Phase 4: Email Provider & Verified Sender Domain
1. Sign up or log in at [Resend](https://resend.com) (or Brevo).
2. Go to **Domains > Add Domain**:
   - Enter your domain (e.g., `yourdomain.org`).
3. Add the displayed DNS records to your domain DNS manager (Cloudflare, GoDaddy, Namecheap):
   - **MX Record** (feedback loop)
   - **TXT Record** (SPF verification)
   - **CNAME Records** (DKIM cryptographic signing)
4. Click **Verify DNS Records** in Resend.
5. Once verified, go to **API Keys > Create API Key**:
   - Permission: Full Access.
   - Copy key (starts with `re_`) &rarr; use for `RESEND_API_KEY`.
6. Set `EMAIL_FROM="SketchHUB Events <noreply@yourdomain.org>"`.
7. If using Brevo instead:
   - Provide `BREVO_API_KEY` (starts with `xkeysib-`).
   - Set `EMAIL_PROVIDER=brevo`.

---

### Phase 5: Hosting & Production Environment Deployment
1. Deploy repository to [Vercel](https://vercel.com) (or Cloud Run):
   - Import repository: `SKETCH EVENTS APP`.
   - Framework preset: **Next.js**.
   - Root directory: `./`.
   - Build command: `npm run build` (or Next.js default).
2. Configure **Environment Variables** in Vercel Project Settings:
   ```ini
   APP_MODE=production
   NEXT_PUBLIC_APP_URL=https://your-production-domain.com
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_<your-resend-key>
   EMAIL_FROM=SketchHUB Events <noreply@yourdomain.org>
   CRON_SECRET=<generate-random-32-byte-hex>
   ```
3. Deploy the application.

---

### Phase 6: Automated Outbox Cron Scheduling
The transactional outbox requires periodic invocation to claim and deliver queued email batches.

> [!IMPORTANT]
> **HTTP POST Method Requirement:**  
> The endpoint `/api/cron/process-outbox` strictly requires an HTTP `POST` method with header `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`. All `GET` requests return HTTP 405 Method Not Allowed to prevent accidental invocation by web crawlers or browser prefetching.
>
> **Scheduler Selection:**
> - Vercel Cron natively sends HTTP `GET` requests. Therefore, to trigger outbox processing, configure a scheduler that supports HTTP `POST` with custom headers.
> - **Recommended options**:
>   1. **Upstash QStash**: Create a scheduled destination for `POST https://your-production-domain.com/api/cron/process-outbox` with cron `* * * * *` and header `Authorization: Bearer <CRON_SECRET>`.
>   2. **Google Cloud Scheduler**: HTTP target `POST https://your-production-domain.com/api/cron/process-outbox` every 1 minute with header `Authorization: Bearer <CRON_SECRET>`.
>   3. **GitHub Actions Scheduled Workflow**: Run `curl -X POST -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" https://your-production-domain.com/api/cron/process-outbox` on a scheduled schedule.
>   4. **Cron-job.org**: Free scheduler configured for HTTP `POST` with custom request headers.

---

### Phase 7: Production Smoke Test Checklist
After deployment, verify these operational paths:
- [ ] Visit `https://your-domain.com/login` and verify clean loading of cinematic branding.
- [ ] Log in with your admin credentials; confirm redirection to `/`.
- [ ] Verify Topbar badge displays `Production Live` (not `Preview Mode`).
- [ ] Press `Ctrl+K` or click search bar; test universal search for events, attendees, and passes.
- [ ] Create a published event with capacity = 5.
- [ ] Open the public URL `/e/<slug>` in an incognito window; submit an individual registration without logging in.
- [ ] Verify ticket pass with `REG-2026-XXXXX-XXXXXX` displays on confirmation screen.
- [ ] Go to `/attendance` on admin dashboard, select the event, scan/enter the ticket ID, and verify check-in increment.
- [ ] Verify outbox job was created in `/communications` and processed by the cron endpoint.
- [ ] Download an attendance roster from `/exports` and verify CSV formula injection protection (`'` prefix on formula characters).
