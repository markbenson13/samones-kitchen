## SAMone's Kitchen — Admin

An admin web app for running a home-cooked Filipino food (ulam) selling and catering business:

- **Orders** — take customer pre-orders for a "Managing day," track payment/delivery status (Pending → For
  dispatch → Delivered) and mode of payment, edit or add items to an existing order
- **Sales** — record what was actually made and sold per food item per day, with a "Sale" (discounted) price
  option; a regular order automatically carries its quantity/revenue into Sales so nothing has to be logged twice
- **Market Costs** — log a market trip's ingredients/supplies, one or several items at once
- **Expenses** — log other business costs (gas, packaging, delivery, etc.)
- **Food Items** — set cost price / selling price per dish, active/inactive status
- **Dashboard** — totals and a daily chart for a date range, an independent "Right now" day snapshot (today's
  sales, net income, unpaid orders, pending deliveries), and Top 10 food items / Top customers
- **Users** — multi-user access with an approval gate (see Authentication below)

The app auto-refreshes open pages periodically so data stays current across multiple devices open at once, and
surfaces action results (created/updated/deleted, or a validation error) as an auto-dismissing toast.

### Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind CSS) — pinned to a specific 16.x build; see
  [AGENTS.md](AGENTS.md) before assuming any Next.js API behaves like an older/standard release
- [Prisma](https://www.prisma.io) + Postgres (`@prisma/adapter-pg`, no migrations — schema changes go through
  `npm run db:push`)
- [Auth.js (NextAuth v5)](https://authjs.dev) — credentials login plus optional Google OAuth
- [Recharts](https://recharts.org) — dashboard chart
- [Vitest](https://vitest.dev) — unit tests for pure helpers (`src/lib`); everything else is verified by hand
  (or with ad-hoc Playwright scripts) against a throwaway user, since there's no e2e suite

### 1. Set up a Postgres database

Any Postgres works, but [Neon](https://neon.tech) or [Vercel Postgres](https://vercel.com/storage/postgres) are the
easiest to pair with Vercel (free tier, works locally and in production with the same connection string).

Create a database and copy its connection string.

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` / `DIRECT_URL` — from your Postgres provider
- `AUTH_SECRET` — generate with `npx auth secret`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional) — enables "Sign in with Google" on the login page; see
  the comments in `.env.example` for the redirect URI and approval-gate behavior

### 3. Install dependencies, push the schema, and create your first user

```bash
npm install
npm run db:push
npm run create-user -- you@example.com yourPassword "Your Name"
```

Users are stored in the `User` table, not env vars — there's no fixed single admin account. The first user you
create can sign in immediately; anyone who signs in afterwards (via `create-user` again, or Google) needs an
existing user to approve them from the Users page before they can access the app.

### 4. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` and sign in with the email/password you created above.

### Running tests

```bash
npm test
```

Runs the Vitest unit suite (pure helpers in `src/lib`). Everything else — Server Actions, pages, the auth flow —
is verified manually against a real dev database; see `scripts/create-user.mjs` for spinning up a throwaway
account to test with.

### Deploying to Vercel

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the same environment variables from your `.env` (`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, and the
   `GOOGLE_CLIENT_*` pair if you're using Google sign-in) in the Vercel project settings.
4. Deploy. The `build` script runs `prisma generate` automatically; run `npm run db:push` locally (pointed at the
   same production database) once to create the tables, then `npm run create-user` for your first account.

### Notes

- Prices are stored/display in PHP (₱) by default — change the currency in [src/lib/money.ts](src/lib/money.ts) if needed.
- A `.npmrc` pinning the public npm registry is included because this machine's global npm config points at a
  private registry; it's safe to keep committed.
