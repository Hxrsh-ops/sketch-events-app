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

## 📚 Team Collaboration & Engineering Guide

All developer workflows, subsystem ownership maps, Git branching policies, and integration contracts are documented in:
👉 [**CONTRIBUTING.md**](./CONTRIBUTING.md)

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v20+` or `v24+` (LTS recommended)
- npm `v10+` or `v11+`

### Installation

```bash
# 1. Install dependencies
npm ci

# 2. Copy environment template (application runs in Preview Mode by default)
cp .env.example .env.local

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts

- `npm run dev`: Starts the Next.js development server
- `npm run build`: Builds the production application bundle
- `npm run start`: Runs the built production server
- `npm run lint`: Runs ESLint checks across `src/`
- `npm run type-check`: Validates TypeScript types across the codebase (`tsc --noEmit`)
- `npm test`: Runs the Vitest test suite (`vitest run`)
