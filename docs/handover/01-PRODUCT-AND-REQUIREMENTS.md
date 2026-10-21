# SketchHUB — Product Specification & Requirements (`01-PRODUCT-AND-REQUIREMENTS.md`)

> **Target Audience:** Tharika (Project Lead) & SketchHUB Contributors  
> **Source Documents:** `context/01-product-vision.md`, `context/02-requirements-and-workflows.md`, `context/05-domain-model.md`, `context/07-roadmap-and-decisions.md`  
> **Status:** Authoritative product specification; locked design invariants.

---

## 1. Product Vision & Operational Context

**SketchHUB** is an admin-first event operations and participant management platform purpose-built for campus events, student clubs, and technical symposiums.

The core premise of SketchHUB is simple: **Event organizers need a single, calm, dependable, highly auditable control center**, while **students need a fast, zero-friction registration experience**. 

Most commercial ticketing and campus event tools fail students and organizers in two distinct ways:
1. They force college students to create accounts, set passwords, remember logins, and download mobile apps just to attend a one-day workshop or hackathon.
2. They give organizers fragmented, ad-hoc spreadsheets where attendance check-in is prone to screenshot fraud, double-entry, and unlogged edits.

SketchHUB solves both problems by completely separating the **authenticated administrative operational portal** from the **public guest registration experience**.

---

## 2. Target Audience & Personas

| Persona | Environment | Authentication | Primary Goals |
|---|---|---|---|
| **Master Administrator** | Operations Portal (`/`) | Supabase Auth (Email/PW or Google OAuth) + `master_admin` role | Platform-wide governance, administrative roster management, full audit logging, event configuration, database migrations. |
| **Event Manager** | Operations Portal (`/events`) | Supabase Auth + `event_manager` role | Create and publish events, configure dynamic registration forms, design tickets in Ticket Studio, advance multi-stage rounds. |
| **Attendance / Desk Staff** | Mobile / Tablet Attendance Scanner (`/attendance`) | Supabase Auth + `attendance_staff` role | Rapidly scan rotating QR passes at the door, verify valid admissions, handle manual lookup corrections with logged justifications. |
| **Analyst** | Operations Portal (`/analytics`, `/exports`) | Supabase Auth + `analyst` role | View registration velocity, attendance rates, export sanitized CSV rosters (with formula injection protection). |
| **Student / Attendee** | Public Web (`/e/[slug]`, `/tickets/[token]`) | **None** (Opaque bearer link via email) | Register in seconds without creating an account; receive ticket pass with live rotating QR code via email; present pass at the door. |

---

## 3. Locked Architectural & Product Decisions

These decisions have been debated, approved, and codified into the codebase. **They are non-negotiable and must not be altered without formal owner review:**

### D-01: No Student Accounts or Persistent Student Portal (STRICT)
- **Decision:** Participants **never** get a student account, password, persistent profile, or mobile login app.
- **Rationale:** Account creation introduces massive drop-off on campus registration forms. In past college events, up to 40% of students abandoned registration when prompted to verify an email or create a password before signing up.
- **Implementation:** Attendees submit their details on public event landing pages (`/e/[slug]`). Upon successful atomic database registration, a unique high-entropy bearer token is generated. The attendee receives an email containing a secure link to their live ticket pass (`/tickets/[bearer-token]`).

### D-02: No Student Certificate Portal
- **Decision:** Students do not log into a dashboard to download certificates.
- **Rationale:** Consistent with D-01. Certificates are issued directly to eligible attendees via verified email or retrieved via an unguessable unique public verification link.

### D-03: No Mandatory Phone OTP Verification
- **Decision:** Phone numbers may be collected as an informational contact field, but phone OTP (SMS verification) is strictly disabled.
- **Rationale:** SMS OTP incurs significant per-message costs, vendor dependencies (e.g. Twilio), carrier delivery delays in campus venues with spotty cellular reception, and unnecessary friction.

### D-04: No Production-Facing Fake or Fabricated Operational Statistics
- **Decision:** When running in `APP_MODE=production`, the application strictly queries real Supabase PostgreSQL data. Mock fallback data is permanently disabled in production mode.
- **Rationale:** Organizers must never make operational decisions (e.g. closing registration, ordering food, sizing halls) based on synthetic or placeholder metrics.

### D-05: Server-Side Atomic Registration, Capacity, and Eligibility Enforcement
- **Decision:** Capacity checks, registration windows, and duplicate email prevention are enforced inside atomic database transactions (`register_for_event` RPC) with row-level locks.
- **Rationale:** Client-side checks cannot prevent concurrency race conditions when hundreds of students rush to register for a limited-seat hackathon simultaneously.

### D-06: Rotating QR Ticket Security Must Not Be Weakened
- **Decision:** Live tickets use time-windowed HMAC-SHA256 rotating QR codes (refreshed every 30 seconds) coupled with anti-replay hash checks.
- **Rationale:** Static QR codes and PDF tickets are routinely screenshotted, forwarded, and shared across student WhatsApp groups, resulting in multiple students attempting to enter on the same ticket.

### D-07: Restrained, Responsive SketchHUB Design Language
- **Decision:** The UI strictly adheres to the established design system:
  - Dark/light neutral surfaces with deep oxblood / burgundy (`#8F2635`) brand accents.
  - Generous whitespace, clean card surfaces, and accessible Radix UI primitives.
  - Fully responsive on mobile for door staff using smartphones at check-in desks.

---

## 4. Complete Feature Scope

### 4.1 Admin Authentication & RBAC
- Dedicated login portal at `/login` supporting email/password and Google OAuth.
- Role-based authorization enforced via `public.admin_profiles` and Next.js middleware.
- Supported roles: `master_admin`, `event_manager`, `attendance_staff`, `analyst`.
- Temporary preview login credentials are hard-locked in production (`isTemporaryAdminEnabled() === false`).

### 4.2 Event Builder & Lifecycle Management
- Multi-step wizard to create, edit, preview, and publish events (`/events/new`, `/events/[id]`).
- Configurable event modes: `in-person`, `online`, `hybrid`.
- Event lifecycle states: `draft` &rarr; `published` &rarr; `live` &rarr; `completed` &rarr; `archived`.
- Registration windows: Start time, end time, and hard seat capacity limits.
- Dynamic form schema builder: supports custom questions, text fields, selects, radio buttons, checkboxes, and file links.

### 4.3 Public Event Experience & Registration
- Shareable public landing pages at `/e/[slug]`.
- Clean countdown, venue details, speaker info, and real-time seat availability.
- **Individual Registration**: Single student form with duplicate email detection.
- **Team Registration**: Configurable team sizes (e.g., 2–4 members), team leader assignment, member detail capture, and team name uniqueness.

### 4.4 Ticket Studio & Template Versioning
- Visual Ticket Studio at `/studio` with live canvas rendering (`unified-ticket-card.tsx`).
- Categorized design presets: Cinematic, Minimal, Modern, VIP, Conference.
- Custom background image uploads with client and server-side magic byte validation (PNG, JPEG, WebP up to 5MB) stored in Supabase Storage bucket `ticket-assets`.
- **Immutable Versioning**: When an event is assigned a template version, that version is locked. Subsequent edits create a new draft version, preventing existing issued tickets from breaking.

### 4.5 Live Digital Passes & Rotating QR Verification
- Digital ticket pass accessible via `/tickets/[bearer-token]`.
- Generates dynamic, client-side rotating QR codes refreshed every 30 seconds.
- QR payload: Signed JSON Web Token containing ticket ID, event ID, time window, and cryptographic HMAC signature.
- Check-in terminal at `/attendance`: Door staff scan the QR code via webcam/mobile camera or manual keyboard input.
- Database RPC `verify_rotating_qr` checks time drift, signature validity, ticket status, and marks attendance atomically.

### 4.6 Transactional Email Outbox & Communications
- Provider-neutral email engine with adapters:
  - **Resend**: Primary production provider.
  - **Brevo**: Production fallback adapter.
  - **Mailpit**: Local development capture (port 54324).
  - **Test**: In-memory unit test mock.
- Database-backed transactional outbox table: `communications_outbox`.
- Background worker with `FOR UPDATE SKIP LOCKED` atomic job claiming.
- Retry handler with bounded exponential backoff (max 3 retries) and dead-letter failure logging.
- Communications dashboard at `/communications` to inspect delivery telemetry, retry failed emails, and view raw payloads.

### 4.7 Multi-Stage Rounds & Advancement
- Support for competitive events with multiple rounds (e.g., Prelims &rarr; Semifinals &rarr; Finals) at `/rounds`.
- Participant and team advancement controls with score logging and status tracking.

### 4.8 Attendance, Audit Logs, Analytics & Exports
- Attendance dashboard (`/attendance`) with live check-in counters and manual override modal requiring a mandatory justification reason.
- Universal global search (`Ctrl+K`) to rapidly locate attendees, events, and ticket numbers across the platform.
- Immutable audit log (`/audit`) capturing actor, action, timestamp, target, and JSON diffs.
- Operational analytics (`/analytics`) showing registration velocity, check-in percentages, and attendance timelines.
- Data export center (`/exports`) generating sanitized CSV and JSON roster downloads with Excel formula injection sanitization (`'` prefix on `=`, `+`, `-`, `@`).

---

## 5. Explicit Non-Goals (Out of Scope)

To prevent scope creep and maintain platform stability, the following features are **explicitly out of scope**:
1. **Public Event Ticketing / Paid Registrations**: SketchHUB is an operations tool for free or externally sponsored campus events. Payment gateways (Stripe, Razorpay) are not integrated.
2. **General-Purpose Social Network / Community Feed**: No student forums, direct messaging, or public user profiles.
3. **Native Mobile App Store Releases**: The web application is responsive and runs on mobile browsers (iOS Safari, Android Chrome). No React Native or Flutter codebase is planned.
4. **Offline P2P Mesh Attendance**: Attendance verification requires an active internet connection to the central Supabase database to prevent double check-ins.

Proceed to [**02-ARCHITECTURE-AND-TECH-STACK.md**](./02-ARCHITECTURE-AND-TECH-STACK.md) to inspect the technical architecture and code implementation.
