# Exclusive

Mentorship-based social platform: Next.js 15 (App Router, TypeScript) + Supabase (Postgres, Auth, Storage, Realtime).

## Run locally
```bash
npm install
cp .env.example .env.local   # already contains your project URL and publishable key
npm run dev
```
Open http://localhost:3000.

## Supabase setup (already applied to project `sjkyaqfpighicwdcssln`)
- Tables, row-level security, rules (2-layer visibility, slot and DM limits, one-week Global Post rule), storage buckets and realtime are in the database.
- To keep the SQL in this repo: install the Supabase CLI, run `supabase link --project-ref sjkyaqfpighicwdcssln`, then `supabase db pull`.
- Generate types: `npm run types`.
- **Authentication → Email Templates → Confirm signup:** use `{{ .Token }}` so users receive a code (the app has a code-entry screen).
- **Authentication → URL Configuration:** add your Vercel URL and `http://localhost:3000`.

## Deploy
Import the repo into Vercel and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Notes
- Never use the `service_role` key in client code.
- Premium tiers are set in `profiles.premium_tier` (0, 1, 2) and organizations in `organizations.tier` until a payment provider is added.
- A scheduled job should call `private.notify_expiring()` daily to send the one-week expiry reminders (e.g. with pg_cron).

## Optional settings
- `NEXT_PUBLIC_ONBOARDING_VIDEO_URL`: URL of the onboarding explainer video (mp4). If unset, the video step shows a placeholder and Continue.

## Launch checklist (safety, privacy, abuse protection)
1. **Legal details:** edit `src/lib/legal.ts` (company name, address, contact and privacy emails, governing law). The Terms, Privacy Policy and Data Protection pages are a draft; have a qualified lawyer review them (Nigeria NDPA 2023, and GDPR if you serve EU users).
2. **Account deletion:** add `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API Keys) to `.env.local` and to Vercel. Server-only; never expose it in the browser.
3. **Captcha:** create a free Cloudflare Turnstile widget, set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, then in Supabase go to Authentication → Attack Protection → enable CAPTCHA (Turnstile) and paste the secret key.
4. **Leaked-password check:** Supabase → Authentication → Sign In / Providers → Email → "Prevent use of leaked passwords" (may require the Pro plan).
5. **Auth rate limits:** review Supabase → Authentication → Rate Limits.
6. **Admins:** the first admin is set in the database. To add another: `insert into public.account_flags (id, is_admin) select id, true from auth.users where email = 'person@example.com' on conflict (id) do update set is_admin = true;` The admin page is at `/admin`.

## Images
Photos are resized in the browser before upload (profile photos: 320 px square WebP; post photos: max 1280 px WebP at about 80% quality), which also removes hidden location/camera data. Files are cached for a year. Old files are deleted when a profile photo is replaced or a normal post is deleted. Post photos live in a **private** bucket and are shown through expiring links that are only issued for posts the viewer is allowed to see.
