# Toodle

A lightweight text-first chat app. The fun is not media. It is moods, shortcuts, streaks, and conversations that can disappear.

**Talk. Play. Poof.**

## What it does

- Simple accounts: display name, unique username, private email
- Moods, emoji identity, online status
- Search by username and ping someone before a chat exists
- Real-time text chat over Socket.IO
- Conversation rules: message fade, message limit, countdown, ghost mode, challenge mode, clean slate
- Renewal requests before a countdown ends
- Conversation streaks, calculated on the server in UTC
- Personal shortcuts (`/gm`), safe actions (`/streak`, `/rules`, `/renew`, `/ghost`, `/gif`), and shared shortcuts
- GIF picker that uses Giphy when a key is set, and playful placeholders otherwise
- Reactions, replies, typing, read status

No calls, uploads, feeds, or public marketplace.

## Architecture

```
client/     React, Vite, TypeScript, Tailwind, Framer Motion
server/     Express, Socket.IO, rule engine, shortcut engine, streak engine
supabase/   Postgres schema, RLS, expiration functions
```

The browser talks to Supabase Auth only. Chat, requests, rules, and shortcuts go through the API so permission checks stay on the server. Socket.IO is the live path. Supabase Realtime is enabled for notifications as a complement, not the source of truth.

Timestamps are stored in UTC. Countdowns use the `X-Server-Time` header so the browser clock is not trusted. Message deletion and conversation expiry run in Postgres functions and a server worker.

Streaks use UTC days. A day counts only after both people send a message that day. The countdown until midnight is shown in the viewer's local clock.

## Setup

1. Create a Supabase project.
2. In Authentication → Providers → Email, turn **off** "Confirm email" for the short onboarding flow. Email is still private and never shown to other people.
3. Open the SQL editor and run `supabase/migrations/20260929000000_init.sql`.
4. Copy env files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

5. Fill in:

| Variable | Where | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | server | Project URL |
| `SUPABASE_ANON_KEY` | server | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | server | service role. Never put this in the client. |
| `CLIENT_ORIGIN` | server | Vite origin, default `http://localhost:5173` |
| `GIPHY_API_KEY` | server | Optional. Empty uses placeholder GIFs. |
| `VITE_SUPABASE_URL` | client | Same project URL |
| `VITE_SUPABASE_ANON_KEY` | client | anon public key only |
| `VITE_API_URL` | client | `http://localhost:4000` |

## Commands

```bash
npm install
npm run dev
```

That starts the API on port 4000 and the app on port 5173.

```bash
npm test          # rule, streak, shortcut, and permission tests
npm run build     # typecheck server and build the client
npm run seed      # development users only
```

### Seed users

Password for every sample account: `toodle-dev-1`

| Username | Email |
| --- | --- |
| @akki | akki@seed.toodle.app |
| @bestie | bestie@seed.toodle.app |
| @coffeeaddict | coffeeaddict@seed.toodle.app |
| @moon | moon@seed.toodle.app |
| @chaos | chaos@seed.toodle.app |

Seed data includes a pending ping, an accepted pair, a countdown chat, a conversation shortcut, and a shared shortcut waiting to be accepted. Do not run it in production.

## Render

`render.yaml` defines two services from this repo.

1. **toodle-api** — Node web service. Start command `npm run start -w server`. Health check `/api/health`.
2. **toodle-web** — static site. Publish `client/dist`. Client-side routes rewrite to `index.html`.

Create the API first, then set these in the Render dashboard. Vite reads the client values at build time, so change them and redeploy the static site.

| Service | Variable | Value |
| --- | --- | --- |
| toodle-api | `CLIENT_ORIGIN` | The toodle-web URL, for example `https://toodle-web.onrender.com` |
| toodle-api | `SUPABASE_URL` | Project URL |
| toodle-api | `SUPABASE_ANON_KEY` | anon key |
| toodle-api | `SUPABASE_SERVICE_ROLE_KEY` | service role. Server only. |
| toodle-api | `GIPHY_API_KEY` | Optional |
| toodle-web | `VITE_API_URL` | The toodle-api URL, for example `https://toodle-api.onrender.com` |
| toodle-web | `VITE_SUPABASE_URL` | Same project URL |
| toodle-web | `VITE_SUPABASE_ANON_KEY` | anon key only |

In Supabase Auth, add the toodle-web URL to the site URL and redirect allow list. Run the SQL migration before the first signup.

The service role key never goes in the client. Row level security is the second lock. The API still checks membership, shortcut permission, and renewal permission itself.

## Rules and shortcuts

Rules live in `conversation_rules` as `rule_type + enabled + configuration`. Add a type to `RULE_TYPES` and teach `ConversationRuleEngine` how to validate it. The chat send path already asks the engine before it stores a message.

Shortcuts are `TEXT`, `ACTION`, or `SYSTEM`. Actions are an allowlist: `streak`, `mood`, `rules`, `renew`, `ghost`, `gif`, `shrug`. Nothing in a shortcut is executed as code. A shared shortcut works only after the recipient accepts it, and stops when the owner revokes it.
