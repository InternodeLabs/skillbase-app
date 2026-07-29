# Skillbase

A Vercel-ready Next.js (App Router) app that presents a **Skill Library** and skill
detail pages. Authentication is delegated to the central **portal-frontend**
(`internode`) auth authority — Skillbase is a *consumer*, exactly like the Chrome
extension and iOS app. It does not run its own identity provider.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Deployable to Vercel with zero extra config

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`, then to the portal
to authenticate.

> Note: if you run the portal locally on port 3000, run Skillbase on another port,
> e.g. `npm run dev -- -p 3100`, and set `PORTAL_BASE_URL=http://localhost:3000`.

## Environment variables

| Variable         | Required | Description                                                        |
| ---------------- | -------- | ------------------------------------------------------------------ |
| `PORTAL_BASE_URL`| yes      | Base URL of the portal central auth authority.                     |
| `SESSION_SECRET` | yes      | Secret to sign the local session cookie (`openssl rand -base64 32`).|
| `APP_URL`        | no       | Force this app's public origin for the OAuth `redirect_uri`.        |

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
5. `src/proxy.ts` (Next.js route protection) guards every route except `/login`
   and `/api/auth/*`.
6. `GET|POST /api/auth/logout` clears the session.

### Portal-side integration required

The portal does not yet expose a **web** redirect flow (its PKCE flow is currently
locked to `*.chromiumapp.org/callback` for the Chrome extension). To complete the
integration, the portal team needs to add web equivalents of the existing extension
endpoints. This app expects:

- **`GET /api/auth/web/start`** — same contract as `/api/auth/extension/start`
  (query: `redirect_uri`, `state`, `code_challenge`, `code_challenge_method=S256`;
  requires a portal session, else redirect to `/signin?callbackUrl=...`; on success
  redirect to `redirect_uri?code=&state=`), but validating `redirect_uri` against an
  **allowlist of web origins** rather than Chrome extension IDs.
- **`POST /api/auth/web/exchange`** — same contract as
  `/api/auth/extension/exchange` (body `{ code, codeVerifier, redirectUri }` →
  `{ apiToken, expiresAt, user }`), reusing `external-client-token.ts` with a
  `clientType: "web"` marker.
- An env-driven **redirect URI allowlist** on the portal, e.g.
  `WEB_APP_ALLOWED_REDIRECT_URIS=https://skillbase.example.com/api/auth/callback,http://localhost:3100/api/auth/callback`.

The closest reference implementations in `portal-frontend` are
`src/app/api/auth/extension/start/route.ts`,
`src/app/api/auth/extension/exchange/route.ts`,
`src/lib/auth/chrome-extension-auth-code.ts`, and
`src/lib/auth/external-client-token.ts`.

Until those routes exist, login will fail at step 2/3 with an `exchange_failed`
error on the `/login` page — the client side here is complete and correct.

## Project structure

```
src/
  app/
    api/auth/{login,callback,logout}/route.ts  # web PKCE flow
    login/page.tsx                             # sign-in screen
    page.tsx                                   # Skill Library grid (protected)
    skills/[id]/page.tsx                       # skill detail (protected)
  components/                                  # AppHeader, ScenarioPreview
  lib/auth/                                    # config, pkce, session, server helpers
  lib/skills/data.ts                           # placeholder skill data
  proxy.ts                                     # route protection (auth guard)
```

## Data

Skill data in `src/lib/skills/data.ts` is placeholder seed content so the grid and
detail pages render before a real data source exists. Swap `getSkills`/`getSkill`
for real fetches (using the session `apiToken` as a bearer) when the backend is ready.
