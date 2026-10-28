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
