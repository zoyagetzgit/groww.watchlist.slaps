# Groww Resilient Watchlist (Code by Groww 2026)

Deployed Website: https://groww-watchlist-sage.vercel.app/

## What this actually does

 Innovative features:

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

The **"Break it" bar** on the dashboard  triggers these failure
modes live — disconnect a feed, inject a garbage price, add artificial
latency — shows the system handling it in real time instead of
describing it in a README.


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





## Stack

- **Backend**: Fastify + TypeScript, Prisma + SQLite (swap `provider` in
  `schema.prisma` + `DATABASE_URL` for Postgres in a real deploy).
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind,
  `idb-keyval` for the offline cache.

## Setup Instructions
Instructions to Run
Step-by-step: getting it running

1. Unzip this and open two terminal windows

You'll keep one terminal running the backend and one running the frontend,
the whole time you're using the app. Open the unzipped folder in your code
editor so you can see `backend/` and `frontend/` as two separate folders.

2. Terminal 1 — start the backend

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
its tables. 
 

```bash
npm run dev
```

Leave this running. You should see:
```
watchlist backend up on http://localhost:4000
```
 
3. Terminal 2 — start the frontend

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

 4. Open the app

Go to `http://localhost:3000` in your browser. Type any name (there's no
password — this is a demo build, see Decisions below) and you're in.

