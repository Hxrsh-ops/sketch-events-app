# SketchHUB — Asset Inventory & Portability Audit (`12-ASSET-INVENTORY-AND-PORTABILITY.md`)

> **Target Audience:** Tharika (Project Lead), Frontend Engineers & DevOps<br/>
> **Repository:** [https://github.com/Hxrsh-ops/sketch-events-app](https://github.com/Hxrsh-ops/sketch-events-app)<br/>
> **Audit Date:** October 2026<br/>
> **Status:** Complete Asset Audit & Cross-Platform Portability Verification.

---

## 1. Executive Summary

A comprehensive asset audit was performed across all public directories, source code components, styles, database seeds, external storage configurations, and email templates.

### Key Audit Findings:
1. **100% of Essential Brand Assets Tracked in Git**: All primary logos, isometric brand marks, and showcase login background photographs are tracked in the Git repository under `public/` and `public/assets/`.
2. **Zero Hardcoded Local File Paths**: No local absolute Windows paths (`C:\`, `E:\`) exist in source code or CSS. All assets use relative public paths (e.g. `/sketch-logo.png`, `/assets/cinematic-sunset-bg.jpg`).
3. **Typography is Self-Hosted**: Google Fonts (`Manrope` and `Inter`) are imported via `next/font/google`, which bundles and self-hosts font binaries during `npm run build`. Fresh clones require no external font downloads at runtime.
4. **Icons are Package-Managed**: UI icons are rendered as inline SVGs via `lucide-react` (`v0.475.0`), completely eliminating missing icon file errors.
5. **Dynamic QR Code Generation**: QR codes are generated programmatically on-demand using the `qrcode` package; no static QR assets are required.
6. **Local Upload Artifacts Isolated**: Test uploads in `public/uploads/` are properly ignored by `.gitignore` to prevent repository bloat and leak of test files.
7. **Remote Cloud Storage Required for Custom Backgrounds**: Ticket Studio background uploads in production rely on Supabase Storage bucket `ticket-assets` (provisioned via Migration `00008_ticket_storage_bucket.sql`).

---

## 2. Complete Asset Manifest

| Asset Path / Identifier | Format & Size | Git Status | Storage Location | Consuming Features & Source Files | Portability to Fresh Clone |
|---|---|---|---|---|---|
| `/sketch-logo.png` | PNG (1.28 MB) | **Tracked** (Committed) | `public/sketch-logo.png` | Primary SketchHUB emblem with wordmark. Displayed in desktop sidebar and mobile navigation drawer (`src/components/layout/sidebar.tsx:170`). | ✅ **Fully Portable** (Available immediately upon clone). |
| `/assets/cinematic-sunset-bg.jpg` | JPEG (181.8 KB) | **Tracked** (Committed) | `public/assets/cinematic-sunset-bg.jpg` | High-resolution architectural sunset photograph. Displayed in desktop admin login showcase panel (`src/app/(auth)/login/page.tsx:279`). | ✅ **Fully Portable** (Available immediately upon clone). |
| `/assets/sketch-isometric-mark.png` | PNG (56.4 KB) | **Tracked** (Committed) | `public/assets/sketch-isometric-mark.png` | Official isometric metallic Sketch logo mark. Displayed on admin login card header (`src/app/(auth)/login/page.tsx:380`). | ✅ **Fully Portable** (Available immediately upon clone). |
| `/assets/sketch-mark-isometric.png` | PNG (56.4 KB) | **Tracked** (Committed) | `public/assets/sketch-mark-isometric.png` | Alternative naming copy of isometric logo mark. | ✅ **Fully Portable** (Tracked in Git). |
| `/assets/donezo-monochrome-reference.png` | PNG (972.1 KB) | **Tracked** (Committed) | `public/assets/donezo-monochrome-reference.png` | Master design reference image from Donezo UI system. Referenced in `README.md` and design system documentation. | ✅ **Fully Portable** (Tracked in Git). |
| `/assets/current-browser-login-capture.png` | PNG (803.9 KB) | **Tracked** (Committed) | `public/assets/current-browser-login-capture.png` | Visual QA desktop screenshot of verified login interface. Used for design regression verification. | ✅ **Fully Portable** (Tracked in Git). |
| `/assets/current-browser-login-mobile.png` | PNG (561.7 KB) | **Tracked** (Committed) | `public/assets/current-browser-login-mobile.png` | Visual QA mobile screenshot of verified login interface. Used for responsive regression verification. | ✅ **Fully Portable** (Tracked in Git). |
| `Manrope` & `Inter` Google Fonts | Web Fonts (WOFF2) | **Auto-Generated** | Next.js Build Cache (`.next/static/media/`) | Global typography defined in `src/app/layout.tsx:7-18`. | ✅ **Fully Portable** (Downloaded & self-hosted by Next.js during `npm run build`). |
| Lucide React UI Icons | Inline SVG | **Package Managed** | `node_modules/lucide-react` | Rendered across all admin panels, buttons, cards, and modal dialogs. | ✅ **Fully Portable** (Installed via `npm ci`). |
| Rotating QR Code Matrix | PNG / Canvas Data URL | **Code Generated** | Dynamic In-Memory | Live digital passes (`/tickets/[token]`) and email passes (`src/lib/ticket/rotating-qr.ts`). | ✅ **Fully Portable** (Generated on-the-fly via `qrcode` package). |
| Default Curated Event Posters | External HTTPS URLs | **CDN Hosted** | Unsplash Global CDN (`images.unsplash.com`) | Default preset event covers in event builder (`src/app/(admin)/events/new/page.tsx:69-82`) and mock data (`src/lib/mock-data.ts`). | ✅ **Fully Portable** (Accessible via public HTTPS). |
| `/public/uploads/ticket-backgrounds/*` | PNG / JPEG | **Ignored** (`.gitignore`) | Local Filesystem (`public/uploads/`) | Temporary uploaded images generated during local tests when `STORAGE_DRIVER=local`. | ⚠️ **Local Only** (Intentionally git-ignored; generated at test runtime). |
| Supabase Storage: `ticket-assets` | Cloud Object Bucket | **Remote Bucket** | Supabase Storage (`storage.buckets`) | Custom background images uploaded via Ticket Studio in production (`src/app/actions/ticket-actions.ts:713`). | ⚠️ **Remote Storage Required** (Requires Migration `00008` applied to Supabase). |

---

## 3. Cross-Platform & Path Portability Verification

### 3.1 Absolute Path Scan
A full recursive regex scan (`([a-zA-Z]:\\|[a-zA-Z]:/)`) was conducted across all TypeScript, TSX, CSS, SQL, and JavaScript files in `src/`, `scripts/`, and `supabase/`:
- **Result:** Zero hardcoded Windows drive letters or absolute local machine paths exist in executable code.
- **Portability:** The codebase can run interchangeably on Windows (PowerShell/CMD), macOS, Linux, and containerized Docker/Vercel environments without path adaptation.

### 3.2 Filename Casing & Linux Case-Sensitivity
Linux file systems (used by Vercel edge runtime and Docker containers) are strictly case-sensitive, unlike Windows NTFS:
- Verified import casing in `src/components/layout/sidebar.tsx`:
  - `src="/sketch-logo.png"` exactly matches `public/sketch-logo.png`.
- Verified import casing in `src/app/(auth)/login/page.tsx`:
  - `src="/assets/cinematic-sunset-bg.jpg"` exactly matches `public/assets/cinematic-sunset-bg.jpg`.
  - `src="/assets/sketch-isometric-mark.png"` exactly matches `public/assets/sketch-isometric-mark.png`.
- Production build verification: `npm run build` completed on Next.js 16.3.8 with zero module resolution or casing errors.

---

## 4. External Cloud Storage Specifications (`ticket-assets`)

For custom background image uploads in Ticket Studio:

### 4.1 Bucket Architecture
- **Bucket Identifier:** `ticket-assets`
- **Provisioning Migration:** `supabase/migrations/00008_ticket_storage_bucket.sql`
- **Visibility:** **Public** (Assets must be viewable by attendees opening their digital ticket passes without needing an authenticated session).
- **Size Limit:** 5,242,880 bytes (5 MB).
- **MIME Whitelist:** `image/jpeg`, `image/png`, `image/webp`.

### 4.2 Storage Security Policies (RLS)
1. **Public Read Policy (`Public Read Ticket Assets`)**:
   - `ON storage.objects FOR SELECT USING (bucket_id = 'ticket-assets')`
   - Allows public web visitors and email clients to render ticket backgrounds.
2. **Admin Upload Policy (`Admin Upload Ticket Assets`)**:
   - `ON storage.objects FOR INSERT`
   - Restricted to `auth.role() = 'service_role'` or authenticated admins in `public.admin_profiles`.
3. **Immutable Asset Policy (`Disallow Ticket Asset Overwrite`)**:
   - `ON storage.objects FOR UPDATE USING (false)`
   - Disallows updating or overwriting existing uploaded images to ensure published ticket version history remains immutable.

### 4.3 Remote Cloud Setup Instructions for Tharika
1. Confirm that migration `00008_ticket_storage_bucket.sql` has been pushed to the remote Supabase project:
   ```powershell
   npx supabase migration list --linked
   ```
2. In the remote Supabase Dashboard:
   - Navigate to **Storage** in the left sidebar.
   - Verify bucket `ticket-assets` appears with a **Public** badge.
   - Verify under **Configuration > Policies** that the 3 policies above are active.

---

## 5. Starter Asset Seeding Process (Zero-Upload Cold Start)

To ensure an organizer can publish tickets immediately without uploading any custom images:
1. Migration `00007_ticket_studio_and_rotating_qr.sql` includes a pre-seeded **Starter Cinematic Template**:
   - **Template ID:** `77777777-7777-7777-7777-777777770001`
   - **Version ID:** `88888888-8888-8888-8888-888888880001`
   - **Slug:** `cinematic-midnight-premiere`
   - **Styling:** Uses native CSS background rendering (`#111315` charcoal surface, `#E2B857` gold border, perforated stub, and animated rotating QR badge).
2. **Zero File Dependency:** This default starter template relies entirely on CSS and SVG canvas rendering, requiring **zero uploaded image assets** to issue production-ready tickets on day one.

---

## 6. Action Items for Tharika & Outgoing Owner

- [x] All core brand assets committed to Git (`public/sketch-logo.png`, `public/assets/*`).
- [x] Local test upload artifacts ignored (`.gitignore`).
- [ ] **Tharika Action:** Verify that remote Supabase project `fvnkhzlbvxemwlkmwhbz` has bucket `ticket-assets` created after applying migration `00008`.
- [ ] **Optional Brand Customization:** If the club decides to update the official emblem, replace `public/sketch-logo.png` with a PNG of matching dimensions (transparent background recommended).
