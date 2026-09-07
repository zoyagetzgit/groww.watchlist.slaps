# Smart Watchlist — Code by Groww 2026

Two separate apps that talk to each other: a Fastify API (`backend/`) and a
Next.js frontend (`frontend/`). You'll run both at the same time, in two
terminal windows. If you've never done a two-server setup before, don't
worry — every command is below, in order.

## What you need installed first

- **Node.js 18 or newer.** Check with `node -v` in your terminal. If that
  command isn't found, install Node from nodejs.org (get the LTS version).
- That's it — everything else (the database, the packages) gets set up by
  the commands below.

## Step-by-step: getting it running

### 1. Unzip this and open two terminal windows

You'll keep one terminal running the backend and one running the frontend,
the whole time you're using the app. Open the unzipped folder in your code
editor so you can see `backend/` and `frontend/` as two separate folders.

### 2. Terminal 1 — start the backend

```bash
cd backend
npm install
```

This downloads all the packages the backend needs (Fastify, Prisma, etc.) —
it can take a minute or two, that's normal.

```bash
cp .env.example .env
```

This creates your local config file from the template. You don't need to
edit anything in it for local use.

```bash
npx prisma migrate dev --name init
```

This creates your local database file (`backend/prisma/dev.db`) and sets up
its tables. You'll see some Prisma output — that's expected.

> **Already had this project set up before and just pulled the alerts
> feature in?** Run `npx prisma migrate dev --name add_price_alerts`
> instead — it adds the new table without touching your existing data.

```bash
npm run dev
```

Leave this running. You should see:
```
watchlist backend up on http://localhost:4000
```
If instead you see an error about the port being in use, something else on
your machine is already using port 4000 — close that, or change `PORT` in
`backend/.env`.

### 3. Terminal 2 — start the frontend

Open a **new** terminal window (don't close the first one) and run:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

You should see:
```
Local: http://localhost:3000
```

### 4. Open the app

Go to `http://localhost:3000` in your browser. Type any name (there's no
password — this is a demo build, see Decisions below) and you're in.

### If something's not loading

- **"Couldn't reach the backend" on the login screen** → check Terminal 1 is
  still running and says `watchlist backend up on http://localhost:4000`.
- **Blank dashboard / stuck on "Loading your watchlist..."** → open your
  browser's dev tools (F12) → Console tab, and see what error shows up.
  Most likely the backend isn't running or `frontend/.env`'s
  `NEXT_PUBLIC_API_URL` doesn't match where the backend actually is.
- **Want to start over with a clean database?** Stop the backend (Ctrl+C in
  Terminal 1), delete `backend/prisma/dev.db`, then re-run
  `npx prisma migrate dev --name init` and `npm run dev` again.

### Optional: skip the empty state

```bash
cd backend
npm run seed
```
Then log in with the name `demo` — you'll get a pre-populated watchlist
that already includes three IT-sector stocks (TCS, INFY, WIPRO), which is
what you want on screen if you're about to demo the sector-contagion
feature.

---

## What this actually does

Five things, each answering a specific part of the brief:

1. **Time-travel diffing** — the backend snapshots exactly what you saw the
   last time you opened this watchlist, and the next visit compares live
   state against *that*, not against "yesterday's close" or any other fixed
   clock. `backend/src/lib/diff.ts`.

2. **Meaningful Change Score (MCS)** — multiplies three 0-1 signals (move
   size relative to the stock's own volatility, volume vs its average,
   whether it's suddenly choppier than usual) and adds a separate bonus for
   an unread catalyst like an upcoming earnings date. Multiplying instead
   of adding means a huge move on dead volume can't score high by itself —
   see the comment block in `backend/src/lib/market/mcs.ts` for the full
   reasoning.

3. **Sector-level contagion dedup** — before building individual alert
   cards, the backend checks whether most of a sector on your list moved
   together, and if so collapses them into one "Sector Event" card with a
   plausible (simulated, clearly labeled) cause instead of one card per
   stock. `backend/src/lib/market/contagion.ts`.

4. **Data honesty** — every price comes from reconciling three simulated
   feeds (A/B/C), each with independent lag, noise, and failure chance. If
   they disagree by more than 1.5%, that's a `CONFLICT` badge. If nothing's
   answered in 3 seconds, that's `STALE`. Otherwise, `LIVE`.
   `backend/src/lib/market/reconcile.ts`.

5. **Offline-first frontend** — every successful response gets cached in
   IndexedDB. If a request fails or takes too long, the UI falls back to
   that cache and says so, with the real age of the data, instead of
   freezing the last number and pretending it's current. Actions taken
   while the backend's unreachable (adding/removing a symbol, creating or
   cancelling an alert) go into a write-ahead log and replay automatically
   once a request succeeds again.
   `frontend/src/lib/offline/`.

6. **GTT-style price alerts** — not real orders (that needs broker execution
   infra, out of scope for a watchlist), but the same trigger-and-expire
   idea: set "alert me when X crosses ₹Y," pick a TTL, and it auto-expires
   if never hit. Runs on a server-side timer independent of any browser
   being open, and only fires against a LIVE-confidence price — never off a
   stale or conflicting one. A triggered alert shows up in "since you last
   checked" the same way a price change would.
   `backend/src/lib/market/alerts.ts`, `backend/src/lib/alertSweep.ts`.

The **"Break it" bar** on the dashboard lets you trigger these failure
modes live — disconnect a feed, inject a garbage price, add artificial
latency — so you can show the system handling it in real time instead of
describing it in a README.

## Why there's no real market data API

I didn't want the demo's fate to depend on a free-tier API rate limit or
unfamiliar wifi. Instead, `backend/src/lib/market/engine.ts` simulates what
a real multi-vendor feed setup looks like underneath — nothing downstream
(reconciliation, scoring, contagion detection) knows or cares that it's
simulated. Swapping in a real feed later means changing one file.

## Architecture

```
backend/
  src/lib/market/  -> universe, engine (feeds), reconcile, mcs, catalysts, contagion
  src/lib/diff.ts  -> time-travel snapshot diffing, folds contagion dedup in
  src/routes/      -> thin Fastify handlers, all logic lives in lib/
  prisma/          -> User, Watchlist, WatchlistItem - kept deliberately small

frontend/
  src/lib/api.ts       -> fetch wrapper with a short timeout (feeds the offline fallback)
  src/lib/offline/     -> IndexedDB cache + write-ahead log
  src/app/dashboard/   -> polling, optimistic updates, degraded-state banner
  src/components/      -> ConfidenceBadge, MeaningfulChangeCard, ContagionCard, BreakItBar, etc.
```

## How this scales

Right now the scoring engine runs in-memory, recomputed per request — fine
for one demo instance. At real scale: feed ingestion becomes an actual
stream (Kafka-shaped, given what Groww's public stack looks like) instead
of request-time simulation; volatility stats get maintained continuously
per symbol instead of recomputed from scratch; and the snapshot JSON blob
becomes a real per-symbol time-series table so history survives restarts
and outlasts a single visit. The IndexedDB cache would also want to move
from idb-keyval to something like RxDB if the app grew into full
multi-device sync with conflict resolution — idb-keyval was the right call
for "cache one thing, queue one kind of action," not for a bigger sync
problem than that.

## Deliberate scope cuts

- No real broker/exchange integration — explained above.
- No password auth — a bearer token that's literally the user's id. Two
  separate origins now (frontend on :3000, backend on :4000), so real
  cookie-based auth would mean CORS/SameSite config for no real security
  benefit at this scope.
- The contagion "cause" (e.g. "a shift in USD/INR") is a plausible guess
  from a small lookup table per sector, not a real news/macro correlation —
  said explicitly in the UI copy, not hidden.
- No historical charting — the score's explanation text is meant to
  replace "go pull up a chart to understand why," not sit next to one.

## Stack

- **Backend**: Fastify + TypeScript, Prisma + SQLite (swap `provider` in
  `schema.prisma` + `DATABASE_URL` for Postgres in a real deploy).
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind,
  `idb-keyval` for the offline cache.
- No component library on the frontend, so nothing looks off-the-shelf.
