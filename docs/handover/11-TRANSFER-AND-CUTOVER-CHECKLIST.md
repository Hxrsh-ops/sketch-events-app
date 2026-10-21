# SketchHUB — Transition & Cutover Checklist (`11-TRANSFER-AND-CUTOVER-CHECKLIST.md`)

> **Target Audience:** Harshanth (Outgoing Lead) & Tharika (Incoming Lead)  
> **Purpose:** Sequential, gate-by-gate cutover protocol for transferring operational authority without service disruption.

---

## 1. Cutover Phase 1: Access Delegation (Outgoing Owner Actions)

The outgoing project owner (Harshanth) must manually execute these tasks:

- [ ] **GitHub Repository Delegation**:
  - [ ] Navigate to `https://github.com/Hxrsh-ops/sketch-events-app/settings/access`.
  - [ ] Invite `@tharikadheena-ui` with **Admin** permissions.
  - [ ] Configure branch protection rules requiring at least 1 PR review before merging into `master`.
- [ ] **Supabase Organization Delegation**:
  - [ ] Log into [https://supabase.com/dashboard](https://supabase.com/dashboard).
  - [ ] Navigate to Organization Settings for `SKETCHUB` &rarr; Team.
  - [ ] Invite `tharikadheena@gmail.com` with role **Owner** or **Administrator**.
  - [ ] Confirm Tharika accepts the invitation.
- [ ] **Google Cloud Platform Delegation**:
  - [ ] Log into [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/iam).
  - [ ] Grant `tharikadheena@gmail.com` the role of **Project Owner** on project containing OAuth Client `794333775225-...`.
- [ ] **Resend Delegation**:
  - [ ] Log into [https://resend.com/team](https://resend.com/team).
  - [ ] Invite `tharikadheena@gmail.com` as Admin.
- [ ] **Vercel Team Delegation**:
  - [ ] Open Vercel Project Settings &rarr; Members.
  - [ ] Add `tharikadheena@gmail.com` as Admin / Project Owner.

---

## 2. Cutover Phase 2: Independent Local Verification (Incoming Lead Actions)

Tharika executes these tests on her own Windows laptop without using Harshanth's computer:

- [ ] **Step 2.1: Clone & Branch Selection**:
  ```powershell
  git clone https://github.com/Hxrsh-ops/sketch-events-app.git
  cd sketch-events-app
  git checkout feat/harshanth-main-development
  npm ci
  ```
- [ ] **Step 2.2: Static Verification Gates**:
  - [ ] `npm run type-check` exits with code 0 (zero errors).
  - [ ] `npm run lint` exits with code 0 (zero errors).
- [ ] **Step 2.3: Local Docker Supabase Boot**:
  - [ ] Launch Docker Desktop on Windows.
  - [ ] Run `npx supabase start`.
  - [ ] Verify Studio at `http://127.0.0.1:54323` and Mailpit at `http://127.0.0.1:54324`.
- [ ] **Step 2.4: Local Migration Verification**:
  - [ ] Run `npx supabase migration list`.
  - [ ] Confirm all 8 migrations (`00001` through `00008`) show status `Applied`.
- [ ] **Step 2.5: Admin Bootstrap**:
  - [ ] In Supabase Studio, create user `tharikadheena@gmail.com`.
  - [ ] Insert profile record into `public.admin_profiles` with role `'master_admin'`.
- [ ] **Step 2.6: Local App Startup & Automated Testing**:
  - [ ] Configure `.env.local` with local keys (`npx supabase status`).
  - [ ] Run `npm test` &rarr; verify that `ticket-background-upload.test.ts` passes completely with local Supabase active.
  - [ ] Run `npm run dev` and sign into `http://localhost:3000/login`.
- [ ] **Step 2.7: End-to-End Registration & Mailpit Verification**:
  - [ ] Create and publish a test event in the admin dashboard.
  - [ ] Open the public event page `/e/[slug]` in an incognito window and register a test attendee.
  - [ ] Verify the live ticket pass `/tickets/[token]` loads with an animated rotating QR code.
  - [ ] Trigger the outbox worker (`Invoke-RestMethod -Uri "http://localhost:3000/api/cron/process-outbox" -Method Post -Headers @{ "Authorization" = "Bearer <CRON_SECRET>" }`).
  - [ ] Open Mailpit at `http://127.0.0.1:54324` and verify the registration ticket email was received.
- [ ] **Step 2.8: Door Check-In Scanner Verification**:
  - [ ] Navigate to `http://localhost:3000/attendance` in the admin portal.
  - [ ] Select the test event.
  - [ ] Scan or submit the rotating QR payload from the ticket pass.
  - [ ] Confirm the attendee status turns green (`CHECKED_IN`).
  - [ ] Submit the same QR payload again and verify rejection with `ALREADY_CHECKED_IN`.

---

## 3. Cutover Phase 3: Remote Synchronization & Launch Gates

- [ ] **Step 3.1: Remote Supabase Link & Backup**:
  - [ ] Run `npx supabase login` and `npx supabase link --project-ref fvnkhzlbvxemwlkmwhbz`.
  - [ ] Verify manual database backup in remote Supabase dashboard.
- [ ] **Step 3.2: Remote Migration Push (00007 & 00008)**:
  - [ ] Run `npx supabase db push --linked`.
  - [ ] Verify migrations `00007` and `00008` applied cleanly via `npx supabase migration list --linked`.
  - [ ] In remote Supabase dashboard, verify storage bucket `ticket-assets` exists.
- [ ] **Step 3.3: Production Environment Variables & Deployment**:
  - [ ] Confirm all environment variables are populated in Vercel settings.
  - [ ] Deploy branch to Vercel production.
  - [ ] Verify production health via `/login`.
- [ ] **Step 3.4: Background Cron Scheduler Activation**:
  - [ ] Configure Upstash QStash or Google Cloud Scheduler to trigger `POST /api/cron/process-outbox` every 60 seconds with `Authorization: Bearer <CRON_SECRET>`.

---

## 4. Cutover Phase 4: Final Sign-Off & Revocation Protocol

The outgoing owner's personal access should **only** be retired after Tharika has confirmed complete operational control:

- [ ] **Formal Acceptance Sign-Off by Tharika**:
  - [ ] Date of Acceptance: `____________________`
  - [ ] Signature / Confirmation: Tharika ([tharikadheena@gmail.com](mailto:tharikadheena@gmail.com))
- [ ] **Optional Revocation of Outgoing Owner Credentials**:
  - [ ] Harshanth demoted from Owner to Collaborator or removed from Supabase Organization.
  - [ ] Harshanth's personal Google account removed from GCP project IAM.
  - [ ] Outgoing personal API keys safely rotated and retired.

Proceed to [**HANDOVER-INDEX.md**](./HANDOVER-INDEX.md) to inspect the complete document index and final project metrics.
