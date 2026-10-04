# SKETCH Event Operations Platform

> **Ideas. People. Events. Beyond Campus.**

SKETCH is an admin-first event operations and management platform designed to give organizers one calm, dependable workspace to publish events, manage registrations, coordinate event-day check-in, communicate with participants, and close out events with attendance records and certificates.

---

## 🏛 Product Boundaries

- **Authenticated Admin Dashboard:** Dedicated operational portal for organizers, event managers, check-in staff, and analysts.
- **Public Event Surfaces:** Clean, responsive event landing pages and registration forms.
- **No Student Accounts:** Participants register via public URLs and receive tickets with secure QR credentials via email. **There is intentionally no persistent student portal, student app, or student login.**

---

## 🎨 Visual Reference & Design System

The application interface is derived from the **Donezo dashboard visual reference** (`CONTEXT/assets/donezo-dashboard-reference.png`):
- Soft, light neutral canvas (`#F5F4F1`) and crisp surface cards (`#FFFFFF`).
- Distinctive SKETCH brand accent: deep oxblood / burgundy (`#8F2635`) with soft rose tints (`#F7E9EB`).
- Persistent desktop left rail navigation with collapsible mobile drawer.
- Wide top utility bar with global search, notifications, and administrator profile.
- Asymmetrical, modular dashboard grid prioritizing operational metrics, recent events, and upcoming actions.

---

## 🛠 Technology Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (Strict checking)
- **Styling:** Tailwind CSS & Custom Design Tokens
- **UI Primitives:** Radix UI, shadcn/ui patterns, Lucide Icons
- **Data & Identity:** Supabase (PostgreSQL with Row-Level Security), Supabase Auth
- **Communications:** Provider-neutral email adapter interface (Outbox pattern)
- **Deployment:** Vercel (Frontend), Cloudflare (DNS/Edge protections), GitHub (Source control)

---

## 📚 Project Documentation

All product specifications, architecture, and design blueprints are maintained in the [`CONTEXT/`](file:///./CONTEXT/) directory:

1. [01 — Product Vision and Boundaries](file:///./CONTEXT/01-product-vision.md)
2. [02 — Requirements and Workflows](file:///./CONTEXT/02-requirements-and-workflows.md)
3. [03 — Design System and Visual Reference](file:///./CONTEXT/03-design-system.md)
4. [04 — Architecture and Security](file:///./CONTEXT/04-architecture-and-security.md)
5. [05 — Domain Model and States](file:///./CONTEXT/05-domain-model.md)
6. [06 — Email, Tickets, QR and Attendance](file:///./CONTEXT/06-email-tickets-attendance.md)
7. [07 — Roadmap and Decision Log](file:///./CONTEXT/07-roadmap-and-decisions.md)
8. [08 — Antigravity Operating Instructions](file:///./CONTEXT/08-antigravity.md)
9. [09 — Frontend Design & Implementation Blueprint](file:///./CONTEXT/09-frontend-design-and-implementation-blueprint.md)

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v20+` or `v24+` (Installed: `v24.13.0`)
- npm `v10+` or `v11+` (Installed: `11.6.2`)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template (optional for mock development)
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts

- `npm run dev`: Starts the Next.js development server
- `npm run build`: Builds the production application bundle
- `npm run start`: Runs the built production server
- `npm run lint`: Runs ESLint checks
- `npm run type-check`: Validates TypeScript types across the codebase
