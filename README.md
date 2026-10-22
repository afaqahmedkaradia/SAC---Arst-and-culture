# SAC — Space for Arts and Culture

A community platform where artists of every discipline share projects, get feedback and get discovered.

- **App:** Next.js 16, deployed on Webflow Cloud at your site's `/app` path
- **Accounts, database and files:** Supabase
- **Public pages (home, about, guidelines):** built in the Webflow Designer

## What's in the MVP

| Area | What people can do |
| --- | --- |
| Accounts | Join as an **Artist** (approved by curators) or a **Member**; log in; reset password |
| Discover | Browse projects by discipline, search, and switch between Featured, Following and New |
| Projects | Artists build projects from image, audio, video (YouTube/Vimeo), text and PDF blocks, credit collaborators, and open them for feedback with a question |
| Feedback | Members answer three guided prompts; artists mark feedback as helpful |
| Social | Appreciate projects, follow artists, save projects into collections |
| Get in touch | Members send inquiries (buying, booking, commissions, collaborations); artists reply by email |
| Dashboards | Artists see feedback, inquiries, stats and their projects; members see their feed, collections and feedback given |
| Curators | Approve artists, feature projects, remove content and handle reports at `/admin` |

---

## Setup, step by step

You only do steps 1–4 once.

### 1. Create the database (Supabase)

1. Open your project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor → New query**.
3. Open [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in this repo, copy everything, paste it in, and click **Run**. You should see "Success. No rows returned."

This creates all the tables, the security rules and a file storage bucket called `media`.

### 2. Set up sign-in emails (Supabase)

1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to your app's address, for example `https://your-site.webflow.io/app`.
3. Under **Redirect URLs**, add `https://your-site.webflow.io/app/**` (and later your own domain, e.g. `https://yourdomain.com/app/**`).

For quick testing you can turn off **Authentication → Sign In / Providers → Email → Confirm email**, so new accounts work without clicking an email link. Turn it back on before inviting the community.

> Supabase's built-in email sender only sends a few emails per hour. Before launch, connect your own email provider under **Authentication → Emails → SMTP Settings** (Resend, Postmark and similar have free tiers).

### 3. Deploy the app (Webflow Cloud)

1. In Webflow, open your SAC site → **Webflow Cloud** → **Import a GitHub repository**, and choose this repository.
2. Set the **mount path** to `/app`.
3. In the environment's **Environment variables** tab, add:

| Name | Value | Type |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dnxbkomhsjvbtuwgximv.supabase.co` | Variable |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your `sb_publishable_…` key | Variable |
| `NEXT_PUBLIC_SITE_URL` | e.g. `https://your-site.webflow.io/app` | Variable |
| `NEXT_PUBLIC_BASE_PATH` | `/app` | Variable |

4. Deploy. Every push to the `main` branch deploys again automatically.

### 4. Make yourself a curator

1. Open your app and **join as an artist**.
2. In Supabase, go to **SQL Editor** and run (with your own email):

```sql
update public.profiles
set is_admin = true, artist_status = 'approved'
where id = (select id from auth.users where email = 'you@example.com');
```

3. Refresh the app. A **Curators** link appears in the header, leading to `/admin`.

### 5. Optional: email notifications

To email artists about new feedback, inquiries and approvals, add these as **Secrets** in Webflow Cloud:

| Name | Where to find it |
| --- | --- |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → secret key (`sb_secret_…`) |
| `RESEND_API_KEY` | A free account at [resend.com](https://resend.com) |
| `EMAIL_FROM` | e.g. `SAC <hello@yourdomain.com>` (a domain verified in Resend) |

Without them, everything still works; notifications just show up in the dashboard instead.

---

## Linking from the Webflow site

Point buttons on your Webflow pages to the app:

| Button | Link |
| --- | --- |
| Explore work | `/app` |
| Meet the artists | `/app/artists` |
| Join SAC | `/app/join` |
| Log in | `/app/login` |

## Running it on your computer (optional)

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open http://localhost:3000.

## Project layout

```
src/app/            pages (Discover, projects, profiles, dashboard, admin, sign-in)
src/app/actions/    server actions for appreciations, follows, feedback, inquiries
src/components/     shared UI (header, project cards, forms)
src/lib/            Supabase clients, constants, helpers
supabase/           database schema and security rules
```
