# Remi waitlist

Landing page for [Remi](https://x.com/AbdulRahmahk1x), a pre-launch AI voice that remembers you for months and years. One page, an email signup, a referral line, and a token-protected admin view. It is a Next.js app meant to deploy on Vercel.

Most AI forgets you the second you open a new chat. Remi remembers you for years.

## Run it locally

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3847](http://localhost:3847).

Without Redis, signups live in memory inside the current server process. That is enough to click through the page. They disappear when the process stops, and on Vercel each instance would have its own empty list. Production needs the env vars below.

## Environment variables

| Name | Required in production | Purpose |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL. `KV_REST_API_URL` is accepted as a fallback. |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token. `KV_REST_API_TOKEN` is accepted as a fallback. |
| `ADMIN_TOKEN` | Yes, for admin | Bearer token for the stats and CSV endpoints. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Public origin, such as `https://remi.vercel.app`, with no trailing slash. Used for canonical and Open Graph URLs. |

Copy `.env.example` to `.env.local` for local Redis. Do not commit `.env.local`.

`WAITLIST_STORE=memory` forces the in-memory store even if Redis is configured. Tests use it. Do not set it on Vercel.

## What the owner has to do to deploy

1. Push this project to a Git repository Vercel can import (GitHub, GitLab, or Bitbucket). If you are still looking at the cloud agent and have not created a repository yet, use the Create repo control in Cursor, then connect that repository.
2. In the [Vercel dashboard](https://vercel.com/new), import the repository. Framework preset: **Next.js**. Root directory: the repo root. Do not change the build command (`next build`) or the output setting.
3. Create a Redis database and attach it to the project.
   - Vercel project → **Storage** / **Marketplace** → **Upstash Redis** (or **Redis** from Upstash). Create a database in a region close to the Vercel region you deploy to, and connect it to this project.
   - Or create one at [console.upstash.com](https://console.upstash.com), open the database, and copy the **REST URL** and **REST token** (not the Redis protocol URL).
4. In the Vercel project → **Settings** → **Environment Variables**, set these for Production (and Preview, if you want preview signups to persist):
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, if the Marketplace integration did not add them. Some integrations set `KV_REST_API_URL` and `KV_REST_API_TOKEN` instead. Either pair works.
   - `ADMIN_TOKEN` to the output of `openssl rand -base64 32`. Vercel will not create this for you.
   - `NEXT_PUBLIC_SITE_URL` to the public origin you will share, including `https://` and without a trailing slash. If you add a custom domain later, update this and redeploy so share cards point at it. When it is unset, production uses Vercel's `VERCEL_PROJECT_PRODUCTION_URL`.
5. Deploy. The first deploy from the import screen is enough if the variables were saved before it. If you added variables afterward, redeploy (**Deployments** → … → **Redeploy**).
6. Check that storage is actually Redis. Sign up once on the live site, then:

```bash
curl -s https://YOUR_DOMAIN/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

`storage` must be `"redis"`. If it says `"memory"`, the Redis variables are missing or misspelled and signups will not survive the next cold start.

7. Download the list when you want it:

```bash
curl -s https://YOUR_DOMAIN/api/admin/export \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o remi-waitlist.csv
```

The CSV is capped at 20,000 rows, best position first. Cells that start with `=`, `+`, `-`, or `@` are prefixed so a spreadsheet does not treat them as formulas.

## Share links

Put the source on the link you post. The signup stores `utm_source`, `utm_campaign`, and `ref`.

- X: `https://YOUR_DOMAIN/?utm_source=x&utm_campaign=launch`
- Reddit: `https://YOUR_DOMAIN/?utm_source=reddit&utm_campaign=launch`

Someone who joins from a referral link (`/?ref=CODE`) is counted as source `referral` unless the link also has a `utm_source`. The referrer still gets credit either way.

## How the line works

- Position 1 is the front.
- People are ordered by how many successful referrals they have, then by who joined first.
- One successful referral moves you ahead of everyone who has fewer referrals than you. Two people with the same count stay in signup order.
- A referral counts when a new email joins with a real `?ref=` code. The same email joining again does not count twice. A code that matches nobody is ignored. You cannot refer yourself.
- Coming back and entering the same email shows the current position and the same link. The browser also remembers the last spot on that device.

Bot protection on `POST /api/signup`: a hidden honeypot field (`company_website`) that pretends to succeed without saving, a per-IP limit (30 requests / 10 minutes), a per-email limit (10 requests / hour), and a same-origin check when the browser sends `Origin`.

## Admin API

Both routes require `Authorization: Bearer ADMIN_TOKEN`.

`GET /api/admin/stats`

```json
{
  "ok": true,
  "storage": "redis",
  "total": 1,
  "signupsPerDay": [{ "date": "2026-11-20", "count": 1 }],
  "signupsBySource": [{ "source": "x", "count": 1 }],
  "topReferrers": [
    {
      "email": "ada@example.com",
      "code": "abcdefgh",
      "xHandle": "ada",
      "referralCount": 3,
      "position": 1
    }
  ]
}
```

Days are UTC. `storage` is `redis` or `memory`. Top referrers are the first ten people with at least one referral.

`GET /api/admin/export` returns `text/csv`. A missing `ADMIN_TOKEN` responds with 503. A wrong token responds with 401.

## Scripts

```bash
npm test        # signup, dedupe, and referral tests
npm run lint
npm run build
npm run dev     # http://localhost:3847
npm start       # after build, same port
```

Open Graph and Twitter cards are generated at `/opengraph-image` and `/twitter-image` (1200×630). The favicon is generated too. Fonts for those images are the SIL Open Font License subsets in `assets/fonts/`.
