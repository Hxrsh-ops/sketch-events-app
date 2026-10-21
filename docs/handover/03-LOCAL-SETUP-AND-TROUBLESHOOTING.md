# SketchHUB — Windows Local Setup & Troubleshooting Guide (`03-LOCAL-SETUP-AND-TROUBLESHOOTING.md`)

> **Target Audience:** Tharika (Project Lead) & Windows Developers  
> **Host Operating System:** Windows 10/11 (PowerShell)  
> **Target Branch:** `feat/harshanth-main-development`  
> **Local Services:** Next.js (`:3000`), Supabase API (`:54321`), PostgreSQL (`:54322`), Studio (`:54323`), Mailpit (`:54324`).

---

## 1. Required Tools & Prerequisites

Before starting, ensure the following software is installed on your Windows machine:

1. **Node.js (LTS v20.x or v22.x/v24.x)**:
   - Download from: [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
   - Verify in PowerShell: `node -v` (should report `v20.x` or higher) and `npm -v` (v10+ or v11+).
2. **Git for Windows**:
   - Download from: [https://git-scm.com/download/win](https://git-scm.com/download/win)
   - Verify in PowerShell: `git --version`.
3. **Docker Desktop for Windows (with WSL2 Backend)**:
   - Download from: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
   - *Requirement:* Must have WSL2 enabled in Docker Desktop settings.
   - Verify in PowerShell: `docker ps`.
4. **Supabase CLI**:
   - You do **not** need a separate global install; we use `npx supabase` bundled in the project.

---

## 2. Clone the Repository & Select the Development Branch

Open **PowerShell as an Administrator or regular user**, navigate to your preferred workspace folder, and run:

```powershell
# 1. Clone the project repository
git clone https://github.com/Hxrsh-ops/sketch-events-app.git

# 2. Navigate into the working directory
cd sketch-events-app

# 3. Fetch all branches from remote
git fetch --all

# 4. Check out the active development branch
git checkout feat/harshanth-main-development

# 5. Verify your current branch
git branch -v
```

> [!IMPORTANT]
> The active feature branch containing all recent Ticket Studio, Rotating QR, and production hardening changes is `feat/harshanth-main-development`. Do not develop directly on `master`.

---

## 3. Install Node Dependencies

Install all dependencies strictly adhering to the committed `package-lock.json`:

```powershell
npm ci
```

If you encounter peer dependency warnings, `npm ci` will cleanly install the exact tree without modifying package locks.

---

## 4. Start Local Supabase (Docker Stack)

SketchHUB uses a self-contained local Supabase stack running in Docker containers.

```powershell
# 1. Ensure Docker Desktop is launched and running on Windows
docker ps

# 2. Start the local Supabase container ecosystem
npx supabase start
```

### Local Service & Port Mapping

Once `npx supabase start` finishes, it outputs your local credentials and exposes these services:

| Service | Local URL / Port | Purpose |
|---|---|---|
| **Next.js Application** | `http://localhost:3000` | Frontend web application & API routes |
| **Supabase API Gateway** | `http://127.0.0.1:54321` | PostgREST API, Auth, and Storage Gateway |
| **PostgreSQL Database** | `127.0.0.1:54322` | Direct database connection (isolated from host) |
| **Supabase Studio** | `http://127.0.0.1:54323` | Web UI for viewing tables, running SQL queries |
| **Mailpit Web UI** | `http://127.0.0.1:54324` | In-browser email inbox for inspecting sent emails |
| **Analytics Backend** | `127.0.0.1:54327` | Local telemetry collector |

> [!NOTE]
> **Windows Host Port 5432 Isolation:**  
> If you have a native PostgreSQL instance running directly on Windows on port `5432`, there is **zero conflict**. Local Supabase binds exclusively to port `54322`.

---

## 5. Verify & Apply Local Database Migrations

When you run `npx supabase start`, the CLI automatically applies all migration files in `supabase/migrations/` (from `00001` through `00008`).

Verify that all 8 migrations are applied locally:

```powershell
npx supabase migration list
```

All 8 files should display a status of `Applied`.

> [!WARNING]
> **DO NOT USE `supabase db reset` CASUALLY!**  
> `npx supabase db reset` is a **destructive command** that drops the entire local database, recreates all tables, and re-runs seed files. Only use `db reset` when you intentionally want to wipe all local test events and start completely fresh. Never use it against a remote database!

---

## 6. Configure Environment Variables (`.env.local`)

Create a local environment file by copying `.env.example`:

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` in VS Code or your text editor. To connect to your **live local Supabase stack**, obtain your local keys by running:

```powershell
npx supabase status
```

Then configure `.env.local` as follows:

```ini
# ------------------------------------------------------------------------------
# 1. RUNTIME MODE
# ------------------------------------------------------------------------------
# Set to 'production' to enforce real database RPCs and Supabase Storage locally.
# Set to 'preview' if you want offline mock data without Docker.
APP_MODE=production
NEXT_PUBLIC_APP_MODE=production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ------------------------------------------------------------------------------
# 2. LOCAL SUPABASE CREDENTIALS (FROM `npx supabase status`)
# ------------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste-anon-key-from-supabase-status>
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-from-supabase-status>

# ------------------------------------------------------------------------------
# 3. EMAIL & MAILPIT CAPTURE
# ------------------------------------------------------------------------------
EMAIL_PROVIDER=mailpit
MAILPIT_URL=http://127.0.0.1:54324
EMAIL_FROM="SketchHUB Local <noreply@sketch.test>"

# ------------------------------------------------------------------------------
# 4. STORAGE DRIVER
# ------------------------------------------------------------------------------
STORAGE_DRIVER=supabase

# ------------------------------------------------------------------------------
# 5. OUTBOX CRON SECRET
# ------------------------------------------------------------------------------
CRON_SECRET=test-local-cron-secret-32-chars-hex-string
```

---

## 7. Bootstrap Local Master Administrator

Because Row-Level Security revokes direct inserts from public roles, create your initial local administrator user via **Supabase Studio**:

1. Open **Supabase Studio** at [http://127.0.0.1:54323](http://127.0.0.1:54323).
2. Go to **Authentication > Users** and click **Add User** &rarr; **Create User**.
3. Enter your email: `tharikadheena@gmail.com` and a password of your choice (e.g. `TestPass123!`).
4. Copy the generated **User UID** (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).
5. In Supabase Studio, navigate to **SQL Editor > New Query** and run:

```sql
INSERT INTO public.admin_profiles (id, email, full_name, role)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- Replace with your actual User UID
  'tharikadheena@gmail.com',
  'Tharika',
  'master_admin'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'master_admin',
  full_name = 'Tharika';
```

---

## 8. Start the Next.js Development Server

Now launch the frontend application:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
- Go to [http://localhost:3000/login](http://localhost:3000/login).
- Sign in with `tharikadheena@gmail.com` and your password.
- You will be redirected to the operations dashboard with the `master_admin` badge in the top bar!

---

## 9. Verification Suite Commands

Always run these verification commands before opening a Pull Request or committing changes:

```powershell
# 1. Validate TypeScript compilation (0 errors required)
npm run type-check

# 2. Validate ESLint code quality (0 errors required)
npm run lint

# 3. Run automated tests via Vitest
npm test

# 4. Verify Next.js production build bundle
npm run build
```

---

## 10. Stopping & Restarting Services

```powershell
# To gracefully stop Supabase containers (preserves all local database data):
npx supabase stop

# To restart Supabase later:
npx supabase start
```

---

## 11. Common Troubleshooting & Error Resolution

### Issue 1: `failed to connect to the docker API`
- **Cause:** Docker Desktop is either not started or the WSL2 Linux engine is stopped.
- **Fix:** Launch Docker Desktop from the Windows Start menu. Wait until the Docker icon turns green (Engine running), then retry `npx supabase start`.

### Issue 2: `Error: connect ECONNREFUSED 127.0.0.1:54321`
- **Cause:** Local Supabase is offline, but the app or test suite is running in `production` mode and attempting to reach the Supabase Storage or Database gateway.
- **Fix:** Run `npx supabase start` to bring up the containers. (This resolves the 2 failing tests in `ticket-background-upload.test.ts`).

### Issue 3: Login Redirects with `error=not_an_admin`
- **Cause:** The user signed into Supabase Auth successfully, but there is no matching row in `public.admin_profiles`.
- **Fix:** Run the bootstrap SQL insert in Section 7 above in Supabase Studio.

### Issue 4: Email Outbox Jobs Remain in `pending` Status
- **Cause:** The background outbox worker runs on an external cron trigger and does not poll continuously.
- **Fix:** Trigger the outbox processor manually via PowerShell:
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:3000/api/cron/process-outbox" -Method Post -Headers @{ "Authorization" = "Bearer test-local-cron-secret-32-chars-hex-string" }
  ```
  Then open Mailpit at `http://127.0.0.1:54324` to view the delivered email!

Proceed to [**05-ENVIRONMENT-AND-SECRET-MANAGEMENT.md**](./05-ENVIRONMENT-AND-SECRET-MANAGEMENT.md) to inspect environment variables and secrets.
