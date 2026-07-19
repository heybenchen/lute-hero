# The Bestiary — backend + app

A tiny Next.js app that stores your musician-pun monsters and serves a
table + statblock editor. Runs locally with zero setup; persists for real
on Vercel once you attach a KV store.

> This app lives in the `bestiary-vercel/` subdirectory of the Lute Hero
> repo. All commands below assume you are inside that folder
> (`cd bestiary-vercel`), and on Vercel you must set the project's **Root
> Directory** to `bestiary-vercel` (see below).

## Run locally

```bash
cd bestiary-vercel
npm install
npm run dev
```

Open http://localhost:3000. With no database configured it uses an
in-memory store seeded with the full roster — great for a look, but edits
reset when the server restarts.

## Deploy to Vercel (persistent)

**Import the repo in the Vercel dashboard** (New Project → import
`heybenchen/lute-hero`), and in the project settings set:

- **Framework Preset:** Next.js
- **Root Directory:** `bestiary-vercel`

That's required because the repo root is the separate Lute Hero (Vite)
app — pointing Vercel at `bestiary-vercel/` makes it build this Next.js
app instead.

Or from the CLI, run from inside the subdirectory:

```bash
npm i -g vercel      # once
cd bestiary-vercel
vercel                # links + deploys a preview
vercel --prod         # production
```

Then give it real persistence:

1. In the Vercel dashboard → your project → **Storage** → create a
   **KV / Upstash Redis** store and connect it to the project.
2. Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.
   (Upstash's own `UPSTASH_REDIS_REST_URL` / `_TOKEN` are also supported.)
3. Redeploy: `vercel --prod`.

On first request the store seeds itself from `lib/seed.js`, then every
add / edit / hide / delete is written straight to KV.

## API

| Method | Route                | Does                       |
|--------|----------------------|----------------------------|
| GET    | `/api/monsters`      | list all                   |
| POST   | `/api/monsters`      | create (`{name,type,baseHp,tagline}`) |
| PUT    | `/api/monsters/:id`  | update any fields          |
| DELETE | `/api/monsters/:id`  | remove                     |

## Data shape

```jsonc
{
  "id": "joustin-beebear-6",
  "name": "Joustin' Beebear",
  "type": "forest",          // fire | sea | sky | forest
  "baseHp": 75,
  "tagline": "Bee-lieber or be stung.",
  "imageUrl": "",            // pasted URL or uploaded data URL
  "hidden": false,
  "levels": [                // per-level HP + effect, editable
    { "level": 1, "hp": 75, "effect": "Entangle — ..." }
  ]
}
```

Images upload client-side, get downscaled to ~512px, and are stored as
data URLs inside the record — no file hosting needed. Swap in a real
blob store later if you'd rather.
