# SketchHUB — Security Invariants & Operational Risk Assessment (`08-SECURITY-AND-OPERATIONAL-RISKS.md`)

> **Target Audience:** Tharika (Project Lead), Security Auditors & DevOps  
> **Source Documents:** `context/04-architecture-and-security.md`, codebase security tests, and database migrations.  
> **Objective:** Concrete, system-specific risk assessment and defensive safeguards.

---

## 1. Concrete Security Boundaries

SketchHUB enforces defensive boundaries across five primary layers:

```
[ Public Web (Guest) ]  ──> [ Next.js Server Actions ]  ──> [ Supabase RLS / RPCs ]  ──> [ PostgreSQL Engine ]
          │                                                                                       │
          └── Opaque Bearer Token Hash (SHA-256)                                                  └── Row-Level Locks
```

### 1. Secret Handling & Server Isolation
- **Boundary:** Privileged keys (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`) are imported exclusively in `src/lib/env.server.ts`, which begins with `import "server-only"`.
- **Enforcement:** If any client component attempts to import from `env.server.ts`, Next.js aborts the build with a fatal compile error.
- **Risk & Safeguard:** Never use the service-role key in browser-accessible clients. The browser only receives `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which cannot bypass Row Level Security.

### 2. Administrative Role Enforcement (RBAC)
- **Boundary:** Every admin action in `src/app/actions/` verifies identity through `verifyAdminSession()`.
- **Enforcement:** `verifyAdminSession()` checks the authenticated Supabase user against `public.admin_profiles`. Having a valid Supabase Auth login is insufficient; the user UID must exist in `admin_profiles` with an active role (`master_admin`, `event_manager`, `attendance_staff`, `analyst`).
- **Elimination of Preview Bypass:** The temporary development credentials (`SKETCHADMIN`) have been permanently disabled via `isTemporaryAdminEnabled() === false`. In production mode, any attempt to use preview cookies returns `403 Forbidden`.

### 3. Registration Concurrency & Idempotency
- **Boundary:** Registration submissions are processed by PostgreSQL stored procedure `register_for_event`.
- **Enforcement:**
  - The event row is acquired using `SELECT ... FOR UPDATE`, serializing concurrent registrations for the same event.
  - Remaining capacity is evaluated atomically inside the transaction. If `registered_count >= capacity`, the transaction rolls back immediately with `EVENT_FULL`.
  - Duplicate registration protection is guaranteed by PostgreSQL unique constraint:
    ```sql
    CONSTRAINT uq_active_event_attendee_email UNIQUE (event_id, attendee_email)
    ```
  - An attendee submitting the form multiple times concurrently cannot register twice or consume multiple seats.

### 4. Ticket Bearer Token & Rotating QR Security
- **Boundary:** Public ticket passes at `/tickets/[bearer-token]` do not expose user credentials or database IDs.
- **Enforcement:**
  - When a registration is confirmed, a cryptographically secure 32-byte hexadecimal bearer token is generated.
  - The database **only stores the SHA-256 hash** of this bearer token:
    ```sql
    bearer_token_hash = encode(sha256(raw_token), 'hex')
    ```
  - Even if an attacker gains read-only access to the `tickets` table, they cannot forge pass URLs or reconstruct the raw bearer tokens.
- **Rotating QR Invariants:**
  - The live QR code refreshes every 30 seconds based on an HMAC-SHA256 signature combining the ticket ID and current time window: `window = floor(Date.now() / 30000)`.
  - Verification allows $\pm 1$ window drift (total 90 seconds) to handle client-side phone clock discrepancies.
  - Replay protection: Once verified, the database sets attendance state. A second scan of the same QR code or a cached screenshot immediately triggers an `ALREADY_CHECKED_IN` alert on the scanner terminal with the exact prior check-in timestamp and desk operator name.

### 5. Cross-Event Isolation
- **Boundary:** Desk staff cannot scan attendees into the wrong event.
- **Enforcement:** The attendance scanner at `/attendance` requires selecting the active event. The verification RPC `verify_rotating_qr(p_event_id, ...)` verifies that the scanned ticket belongs strictly to `p_event_id`. If an attendee presents a valid ticket for Event A at the door of Event B, the system rejects it with `WRONG_EVENT`.

---

## 2. Operational Risk Register & Mitigations

| Risk Identifier | Scenario | Impact | Mitigation in Codebase |
|---|---|---|---|
| **R-01: Outbox Replay / Duplicate Mass Emails** | Outbox worker crashes midway through sending a batch of 50 emails. | High: Attendees receive duplicate emails; Resend quota depleted. | Outbox worker uses `public.claim_outbox_jobs` with `SELECT ... FOR UPDATE SKIP LOCKED` to lock jobs into `processing` state before calling provider APIs. Completed jobs are atomically marked `sent`. |
| **R-02: Accidental Webhook Trigger / Crawler DoS** | Web crawler or bot hits `/api/cron/process-outbox`. | Medium: Unauthorized outbox processing triggers or CPU spikes. | Endpoint strictly enforces **HTTP POST**. All `GET` requests return `405 Method Not Allowed`. Requires header `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`. |
| **R-03: Formula Injection in Roster Exports** | Malicious attendee registers with name `=cmd|'/C calc'!A0` or `@SUM(...)`. | High: Admin opens exported CSV in Excel; arbitrary command execution. | Export action (`src/app/actions/export-actions.ts`) sanitizes every field: prepends a single quote (`'`) to any cell starting with `=`, `+`, `-`, or `@`. |
| **R-04: Storage Asset Tampering / Overwrite** | Malicious admin or script attempts to overwrite a published ticket background image. | Medium: Visual tampering with live tickets. | Storage bucket policy `Disallow Ticket Asset Overwrite` enforces `USING (false)` on `UPDATE` operations in `storage.objects`. |
| **R-05: Missing Remote Database Migrations** | Code is deployed to production before remote database schema contains tables for Ticket Studio (`00007`) or Storage (`00008`). | Critical: Application crashes on `/studio` and `/attendance` routes. | Mandatory migration parity check (`npx supabase migration list --linked`) enforced in handover checklist before deployment. |
| **R-06: Database Port Collision (Windows)** | Windows developer has local PostgreSQL running on port `5432`. | Low: Startup failure if ports clash. | `supabase/config.toml` explicitly assigns local Supabase database to port `54322`, completely bypassing Windows host port `5432`. |
| **R-07: Unchecked Attendance Overrides** | Door staff manually check in unauthorized friends without scanning tickets. | Medium: Unaccounted attendees; capacity breach. | Manual override action (`toggleAttendanceAction`) strictly requires a non-empty `reason` string and logs the operator ID, target ticket, and reason to `public.audit_logs`. |

---

## 3. Disaster Recovery & Emergency Rollback Procedures

### Scenario A: Remote Migration Push Failure
- **Trigger:** Running `npx supabase db push --linked` fails halfway due to a syntax error or constraint conflict.
- **Rollback:**
  1. Open Supabase Dashboard &rarr; Database &rarr; Backups.
  2. Restore the point-in-time snapshot created immediately prior to the migration attempt.
  3. Revert local migration files and run `npx supabase migration list --linked` to verify restoration.

### Scenario B: Resend Email Provider Outage
- **Trigger:** Resend API experiences an outage or account suspension during event day.
- **Rollback:**
  1. Open Vercel Project Settings &rarr; Environment Variables.
  2. Change `EMAIL_PROVIDER=resend` to `EMAIL_PROVIDER=brevo`.
  3. Ensure `BREVO_API_KEY` is populated.
  4. Redeploy Vercel application. All queued outbox jobs in `communications_outbox` will automatically be dispatched via Brevo without losing any email intents.

Proceed to [**09-ROADMAP-AND-RELEASE-CHECKLIST.md**](./09-ROADMAP-AND-RELEASE-CHECKLIST.md) to inspect the prioritized development roadmap and release gates.
