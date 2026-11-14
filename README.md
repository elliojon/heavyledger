# Heavy Ledger

The professional network for fitness trainers, coaches, gyms, and sport scientists.

Publish substantive work. Build credibility. Connect with clients based on demonstrated expertise — not follower counts.

## Pages

- `/` — Landing page
- `/profile` — Professional profile mockup
- `/dashboard` — Logged-in home experience
- `/model` — Financial projection model
- `/log` — Training log (sign in with an emailed link; data in Supabase)
- `/u/[username]` — Public profile: featured lifts and public sessions

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Training log & profiles setup

1. Create a Supabase project, then run `supabase/schema.sql` in its SQL Editor.
2. In Supabase → Authentication → URL Configuration, set the Site URL to `https://heavyledger.com` and add redirect URLs `https://heavyledger.com/**` and `https://*.vercel.app/**`.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`) to Vercel and to `.env.local` for local development.

Without those variables, `/log` runs in preview mode and saves to the browser only.

## Deploy

Connected to Vercel for automatic deployments from `main` branch.
