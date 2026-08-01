<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Skillbase — agent notes

Deeper rationale: [`docs/architecture.md`](docs/architecture.md). Human how-to: [`README.md`](README.md).

## Non-negotiable decisions

### Auth

- Skillbase is an auth _consumer_ of Internode (`portal-frontend`). Do not add a local identity provider.
- Browsing (`/`, `/skills/[id]`) is **public**. Auth gates features (e.g. edit), not pages.
- Share URLs: `/skills/[id]` (website). Add `?raw=1` (and optional `?v=N`) to get the
  skill markdown as plain text — for agents or anyone who wants the body.
- Sign-in CTAs go to `/authenticating?returnTo=…` (Google / Microsoft picker, then
  a brief pause), which continues to `/api/auth/login?returnTo=…&provider=…`
  (Internode PKCE start). Do **not** send users to `/login` as the normal path —
  that page is for auth _errors_ only.
- Session user id comes from the portal (`session.user.id`). Use that string as `owner_user_id` / `author_user_id`.

### Data model

- Plain Postgres + Drizzle. **Not** a git-style versioned DB (Dolt, etc.).
- `skill` = lineage container (slug, owner, optional `forked_from_version_id`).
- `skill_version` = append-only snapshot. Edits create a new row; never mutate an old version.
- **Visibility is per version** (`public` | `private`), not per skill — a fork can be public at v1 and private at v2.
- Forking = insert a new `skill` pointing at the source version, then copy that body into the new skill’s v1.
- Public library / logged-out reads: latest **public** version per skill. Logged-in owners also see their private versions.

### Environments

- **Local:** Docker Postgres via `docker compose` (`localhost:5433`). Use `.env.local`. Do not point daily local work at Neon.
- **Production:** Neon via Vercel Marketplace. Only the **Production** env is wired for now — no Preview/stage DB.
- Neon creates many env aliases (`DATABASE_POSTGRES_*`, `DATABASE_PG*`, etc.). The app only reads **`DATABASE_URL`**. Ignore the rest.
- Driver is auto-selected from the URL in `src/lib/db/client.ts` (Neon host → neon-http; else `pg`). Override with `DB_DRIVER=pg|neon` only if needed.
- Do not dump Neon vars into `.env.local`. Only add Neon `DATABASE_URL` to a local production env file when deliberately migrating/seeding prod from a laptop.

### Stack defaults

- Drizzle ORM + `@neondatabase/serverless` (prod) + `pg` (local).
- Stay within Vercel Hobby + Neon free unless the user explicitly opts out.
- Prefer outcome-focused changes; don’t expand scope into create/fork/version writes unless asked.

### Dependencies

- Before writing new helpers/utilities, check `package.json` for an existing dependency that already covers the need.
- Prefer adding a well-maintained NPM package over a custom implementation when the problem is solved by a common library.
- Do not reinvent parsing, auth helpers, markdown, date formatting, validation, etc. if a stack-default or established package fits.
