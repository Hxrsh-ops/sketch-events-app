# SketchHUB — Production Deployment & Launch Guide (`13-PRODUCTION-DEPLOYMENT-GUIDE.md`)

> **Database Status:** All 10 migrations (`00001` through `00010`) are applied on remote Supabase (`fvnkhzlbvxemwlkmwhbz`).  
> **Code Status:** Verified across TypeScript, ESLint, 46 test suites, and Next.js production build.

---

## 1. Deploy to Vercel (From `master`)

1. Sign in to [https://vercel.com](https://vercel.com) and click **Add New Project** &rarr; import `Hxrsh-ops/sketch-events-app`.
2. Set **Production Branch** to `master` and Framework Preset to **Next.js**.
3. Add these **Environment Variables** in Vercel Project Settings:

| Variable | Value / Source |
|---|---|
| `APP_MODE` | `production` |
| `NEXT_PUBLIC_APP_MODE` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://<your-vercel-domain>` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fvnkhzlbvxemwlkmwhbz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase Dashboard &rarr; Settings &rarr; API |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Dashboard &rarr; Settings &rarr; API |
| `GOOGLE_CLIENT_ID` | `794333775225-5sdlsol9ch0cu9t14av8dhc2s36hvv6s.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret (`GOCSPX-...`) |
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | Production Resend API Key (`re_...`) |
| `EMAIL_FROM` | `SketchHUB <noreply@yourdomain.org>` *(after Step 3)* |
| `STORAGE_DRIVER` | `supabase` |
| `CRON_SECRET` | Generate a strong 32+ char random string |

4. Click **Deploy** and verify `GET https://<your-vercel-domain>/api/health` returns `{"status":"ok","mode":"production","googleOAuthMode":"direct"}`.

---

## 2. Whitelist Production URL in Google Cloud Console & Supabase

1. Open [Google Cloud Console &rarr; Credentials](https://console.cloud.google.com/apis/credentials) and edit your OAuth 2.0 Web Client:
   - **Authorized JavaScript origins:** Add `https://<your-vercel-domain>`
   - **Authorized redirect URIs:** Add `https://<your-vercel-domain>/api/auth/callback`
2. Open [Supabase Dashboard &rarr; Authentication &rarr; URL Configuration](https://supabase.com/dashboard/project/fvnkhzlbvxemwlkmwhbz/auth/url-configuration):
   - Set **Site URL** to `https://<your-vercel-domain>`
   - Add `https://<your-vercel-domain>/**` to **Redirect URLs**.

---

## 3. Verify Sending Domain in Resend (Required for External Attendees)

`onboarding@resend.dev` only delivers to your own Resend account email. Before opening registrations to students:
1. Open [Resend &rarr; Domains](https://resend.com/domains) &rarr; **Add Domain**.
2. Add the SPF/DKIM DNS records at your domain registrar and wait for **Verified**.
3. Update `EMAIL_FROM` in Vercel to use that verified domain (e.g. `SketchHUB <events@yourdomain.org>`) and redeploy.

---

## 4. Enable Automated Outbox Cron Worker

The repository includes [`.github/workflows/outbox-cron.yml`](../../.github/workflows/outbox-cron.yml) which dispatches queued emails every 5 minutes without requiring a paid Vercel Pro plan:
1. Open GitHub Repo &rarr; **Settings &rarr; Secrets and variables &rarr; Actions**:
   - Under **Variables**, add `APP_URL` = `https://<your-vercel-domain>`
   - Under **Secrets**, add `CRON_SECRET` = *(exact same `CRON_SECRET` set in Vercel)*
2. Go to **Actions &rarr; Scheduled Email Outbox Worker &rarr; Run workflow** to verify an `HTTP 200` response.
