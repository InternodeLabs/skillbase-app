# Architecture

Skillbase is a Next.js App Router app that lists and shows skills. Auth is
delegated to Internode. Skills live in Postgres with an explicit version + fork
model (not a specialized versioned database).

## Why plain Postgres

Versions and forks are **first-class product concepts** (users pick v1 vs v2,
see “forked from Sean”). They belong as normal rows you can query, not as
implicit DB history. Git-style engines (Dolt, etc.) don’t fit Vercel Hobby and
add ops we don’t need. Two tables + a self-reference are enough.

## Schema

```
skill                          skill_version
─────                          ─────────────
id (uuid, URL id)              id (uuid)
slug (unique)                  skill_id → skill
owner_user_id (portal id)      version_number (1,2,3… per skill)
forked_from_version_id ───┐    name, summary, description, usage
created_at                │    thumbnail_url (optional)
                          │    parameters / example_output / scenarios (jsonb)
                          └──► visibility: public | private
                               author_user_id
                               created_at
```

### Example lineage

```
skill A (owner=sean, forked_from=null)
  v1 public  author=sean
  v2 public  author=sean
skill B (owner=jen, forked_from = A.v2)
  v1 public  author=jen
  v2 private author=jen
```

### Reads

- Library / detail: latest version the viewer may see (`DISTINCT ON (skill_id)`
  ordered by `version_number desc`).
- Visible if `visibility = 'public'` **or** `skill.owner_user_id = viewer`.
- URL param `/skills/[id]` is the skill lineage **UUID**. Legacy slug URLs still
  resolve for older links.

Defined in `src/lib/db/schema.ts`. Queried via `src/lib/skills/data.ts`.

## Hosting split

| Env        | DB                         | Config                          |
| ---------- | -------------------------- | ------------------------------- |
| Local      | Docker Postgres (`5433`)   | `.env.local` → `DATABASE_URL`   |
| Production | Neon (Vercel Marketplace)  | Vercel Production env only      |

No Preview/stage Neon branch for this phase. Local never uses Neon for day-to-day
dev. The Neon integration injects many aliases; only `DATABASE_URL` is required.

`src/lib/db/client.ts` picks the driver: `*.neon.tech` → Neon HTTP; otherwise
`node-postgres` for Docker TCP.

### Common commands

```bash
npm run db:up        # docker compose up -d
npm run db:migrate   # apply drizzle migrations (loads .env.local)
npm run db:seed      # idempotent sample skill
npm run db:generate  # after schema edits
```

Production migrate/seed: run once against the Neon `DATABASE_URL` (e.g. from the
dashboard or a one-off local env that points at Neon). Do not bake that into
`.env.local`.

## Auth (web PKCE)

Skillbase mirrors the Chrome extension’s PKCE flow for the web:

1. `GET /api/auth/login` — stash verifier/state cookies, redirect to portal
   `/api/auth/web/start`.
2. Portal signs the user in, redirects back with `?code=&state=`.
3. `GET /api/auth/callback` — exchange code for `{ apiToken, expiresAt, user }`,
   store in a signed httpOnly session cookie.
4. Feature gates (e.g. Edit) link to `/authenticating?returnTo=…`, which pauses
   briefly then continues to `/api/auth/login?returnTo=…`. `/login` remains for
   callback error display only.

Portal allowlist must include this app’s callback origin (local `3100` and
`https://app.skillbase.club`).

## Project map

```
src/
  app/
    api/auth/{login,callback,logout}/route.ts
    login/page.tsx                 # error page only for happy-path UX
    authenticating/page.tsx        # brief pause before PKCE login
    page.tsx                       # public skill library
    skills/[id]/page.tsx           # public detail; edit gated
  lib/
    auth/                          # session, PKCE, portal config
    db/                            # client, schema, seed
    skills/{data,types}.ts         # visibility-aware reads + UI types
docker-compose.yml                 # local Postgres
drizzle/                           # SQL migrations
```
