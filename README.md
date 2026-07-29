# Skillbase

A Vercel-ready Next.js (App Router) app that presents a **Skill Library** and skill
detail pages. Authentication is delegated to the central **portal-frontend**
(`internode`) auth authority — Skillbase is a *consumer*, exactly like the Chrome
extension and iOS app. It does not run its own identity provider.

Skills are stored in Postgres (Docker locally, Neon in production) with an
explicit version + fork model. See [`docs/architecture.md`](docs/architecture.md)
for the schema and env split; [`AGENTS.md`](AGENTS.md) for agent-facing rules.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Postgres + Drizzle ORM (`pg` locally, Neon serverless on Vercel)
- Deployable to Vercel (Hobby) with Neon for production data

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run db:up                # start local Postgres (Docker, port 5433)
npm run db:migrate
npm run db:seed
npm run dev -- -p 3100       # 3100 if the portal already owns 3000
```

Open http://localhost:3100 — the Skill Library is public. Sign in when you need
gated features (e.g. editing a skill).

> If the portal runs locally on port 3000, keep Skillbase on 3100 and set
> `PORTAL_BASE_URL=http://localhost:3000`.

## Environment variables

| Variable          | Required | Description |
| ----------------- | -------- | ----------- |
| `PORTAL_BASE_URL` | yes      | Base URL of the portal central auth authority. |
| `SESSION_SECRET`  | yes      | Secret to sign the local session cookie (`openssl rand -base64 32`). |
| `DATABASE_URL`    | yes      | Postgres URL. Local: Docker (`…@localhost:5433/skillbase`). Prod: Neon (set by Vercel). |
| `APP_URL`         | no       | Force this app's public origin for the OAuth `redirect_uri`. |
| `DB_DRIVER`       | no       | Force `pg` or `neon`. Normally inferred from the host. |

Local day-to-day work uses `.env.local` + Docker. Production uses Vercel’s
Production env only (no Preview/stage DB for now). Neon may inject many extra
`DATABASE_*` aliases — the app only needs `DATABASE_URL`.

## How auth works (web PKCE flow)

Skillbase mirrors the Chrome extension's PKCE flow, adapted for the web:

1. `GET /api/auth/login` — generates a PKCE `code_verifier` + `state`, stores them
   in short-lived httpOnly cookies, and redirects to
   `PORTAL_BASE_URL/api/auth/web/start` with `redirect_uri`, `state`,
   `code_challenge`, and `code_challenge_method=S256`.
2. The **portal** authenticates the user via its own NextAuth session (redirecting
   to `/signin` if needed), mints a one-time auth code bound to the challenge, and
   redirects back to `redirect_uri` with `?code=&state=`.
3. `GET /api/auth/callback` — validates `state`, then POSTs
   `{ code, codeVerifier, redirectUri }` to `PORTAL_BASE_URL/api/auth/web/exchange`
   and receives `{ apiToken, expiresAt, user }`.
4. The `apiToken` + user are stored in a signed, httpOnly session cookie. Use it as
   `Authorization: Bearer <apiToken>` for portal API calls.
5. Browsing (`/` and `/skills/[id]`) is public. Auth is feature-gated — e.g. the
   skill detail **Edit** control shows "Login required" and sends you straight to
   `/api/auth/login?returnTo=…` (skips the `/login` interstitial; that page is for
   auth errors).
6. `GET|POST /api/auth/logout` clears the session and returns to `/`.

### Portal-side integration required

The portal must expose a **web** redirect flow (allowlisted origins, not only
Chrome extension callbacks). This app expects:

- **`GET /api/auth/web/start`** — same contract as `/api/auth/extension/start`
  (query: `redirect_uri`, `state`, `code_challenge`, `code_challenge_method=S256`;
  requires a portal session, else redirect to `/signin?callbackUrl=...`; on success
  redirect to `redirect_uri?code=&state=`), validating `redirect_uri` against an
  **allowlist of web origins**.
- **`POST /api/auth/web/exchange`** — same contract as
  `/api/auth/extension/exchange` (body `{ code, codeVerifier, redirectUri }` →
  `{ apiToken, expiresAt, user }`).
- An env-driven **redirect URI allowlist**, e.g.
  `WEB_APP_ALLOWED_REDIRECT_URIS=https://app.skillbase.club/api/auth/callback,http://localhost:3100/api/auth/callback`.

## Project structure

```
src/
  app/
    api/auth/{login,callback,logout}/route.ts  # web PKCE flow
    login/page.tsx                             # auth error interstitial
    page.tsx                                   # Skill Library grid (public)
    skills/[id]/page.tsx                       # skill detail (public; edit gated)
  components/                                  # AppHeader, ScenarioPreview
  lib/auth/                                    # config, pkce, session, server helpers
  lib/db/                                      # Drizzle client, schema, seed
  lib/skills/{data,types}.ts                   # visibility-aware skill reads
docker-compose.yml                             # local Postgres on 5433
drizzle/                                       # migrations
docs/architecture.md                           # schema, forks, env split
```

## Data

Skills are Postgres rows (`skill` + `skill_version`). Reads in
`src/lib/skills/data.ts` return the latest version the viewer may see (public for
everyone; owners also see their private versions). Seed with `npm run db:seed`.
