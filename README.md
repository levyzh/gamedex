# Gamedex

A personal game tracker with a light social layer — keep a list of what you're
playing, rate it, follow other people, and see what they've been up to. Live
game data comes from [RAWG](https://rawg.io).

Built as a learning project alongside its own backend,
[gamedex-api](https://github.com/levyzh/gamedex-api).

## Features

- **My List** — track games by status, score and hours played
- **Browse & search** — RAWG's full catalogue, plus curated category rows
- **Game pages** — details, synopsis, and threaded comments with likes
- **Profiles** — username, bio, avatar, and a public/private list toggle
- **Follows & feed** — follow people and see their recent activity
- **Dark and light themes**, remembered across visits

## Architecture

Three tiers, each owning one thing:

```
  React + Vite SPA  ──HTTP──▶  Spring Boot API  ──JDBC──▶  Supabase Postgres
   (this repo)                  (gamedex-api)
        │
        └──▶ Supabase Auth (identity) + Storage (avatars)
        └──▶ RAWG API (game data)
```

Every database table is served by the Spring API — this app makes no direct
table queries. Supabase still owns identity and avatar storage, and the browser
talks to it for those two things only.

Requests carry the Supabase session token as `Authorization: Bearer <token>`;
the API validates the signature and derives the user from it, so the browser
never asserts who it is.

## Stack

React 19 · TypeScript 6 · Vite 8 · React Router 7 · supabase-js 2

No CSS framework — styling is inline, themed through a React context in
`src/lib/theme.ts`. Fonts (Space Grotesk, Inter) are injected by
`src/lib/styles.ts`.

## Getting started

### Prerequisites

- Node.js 20 or newer
- A running instance of [gamedex-api](https://github.com/levyzh/gamedex-api) —
  without it, everything except browsing RAWG data will fail
- A [Supabase](https://supabase.com) project
- A free [RAWG API key](https://rawg.io/apidocs)

### Setup

```bash
git clone https://github.com/levyzh/gamedex.git
cd gamedex
npm install
cp .env.example .env    # then fill in real values
npm run dev
```

The dev server runs at **http://localhost:5173**. That exact origin is the one
allowed by the API's CORS config, so use it rather than `127.0.0.1`.

Vite reads `.env` only at startup — **restart `npm run dev` after any change to
it**, or you'll be debugging a value that was never loaded.

### Environment variables

| Variable | What it is |
|---|---|
| `VITE_RAWG_KEY` | RAWG API key for game data |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `VITE_API_URL` | Base URL of the Spring API (`http://localhost:8080` in dev) |

All four are exposed to the browser — Vite ships anything prefixed `VITE_`.
That's fine for these: the Supabase anon key is designed to be public, and the
RAWG key is a free read-only key. Never add a secret with a `VITE_` prefix.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check with `tsc`, then build to `dist/` |
| `npm run lint` | ESLint across `.js`, `.jsx`, `.ts`, `.tsx` |
| `npm run preview` | Serve the built `dist/` locally |

`build` is gated on `tsc --noEmit`, so a type error fails the build rather than
shipping.

## Routes

| Path | Screen |
|---|---|
| `/` | Home — category rows, sidebar rankings, social feed |
| `/browse` | Full catalogue with filters |
| `/category/:key` | A single category, paginated |
| `/game/:id` | Game detail and comments |
| `/list` | Your tracked games |
| `/user/:id` | Someone's profile |
| `/settings` | Your profile and preferences |

The URL is the single source of truth for what's on screen, so back, refresh
and shared links all behave.

## Project layout

```
src/
  main.tsx          Entry point
  App.tsx           Routing, header, session, shared state

  pages/            One screen per route
  components/       Shared pieces; ui/ holds the generic ones
  api/              Everything that talks to a server
  lib/              Themes, types, constants, helpers
```

Inside `api/`, each domain file (`comments`, `feed`, `follows`, `profiles`,
`list`) owns its own endpoints and error wording, while `client.ts` owns the
mechanics of calling the API — auth headers and error handling. `rawg.ts` and
`supabase.ts` wrap the two third-party services.

`components/ui/` holds pieces with no domain knowledge, like `Icon` and
`ArrowBtn`. Anything that understands games or users sits one level up.

## Status

Feature-complete and running locally; not yet deployed. `npm run lint` reports
26 warnings, all deliberately left as warnings and annotated in
`eslint.config.js` — they're tracked debt, not surprises.