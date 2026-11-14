# Heavy Ledger

The professional network for fitness trainers, coaches, gyms, and sport scientists.

Publish substantive work. Build credibility. Connect with clients based on demonstrated expertise — not follower counts.

## Pages

- `/` — Landing page
- `/profile` — Professional profile mockup
- `/dashboard` — Logged-in home experience
- `/model` — Financial projection model
- `/log` — Sign-in door; forwards to your own logging page
- `/u/[username]` — Profile: banner, photo, credentials, connections, testimonials, records and session history
- `/u/[username]/log` — Logging (owner only)
- `/u/[username]/stats` — Training stats (owner only)
- `/people` — Find people by name or username
- `/u/[username]/writing`, `/u/[username]/p/[slug]`, `/u/[username]/write` — Writing: publication page, posts, editor
- `/read` — Newest writing from everyone

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Training log & profiles setup

1. Create a Supabase project, then run `supabase/schema.sql`, then the files in `supabase/migrations/` in order, in its SQL Editor.
2. In Supabase → Authentication → URL Configuration, set the Site URL to `https://heavyledger.com` and add redirect URLs `https://heavyledger.com/**` and `https://*.vercel.app/**`.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`) to Vercel and to `.env.local` for local development.

Without those variables, `/log` runs in preview mode and saves to the browser only.

## Deploy

Connected to Vercel for automatic deployments from `main` branch.
