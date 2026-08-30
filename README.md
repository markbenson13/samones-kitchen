## Samone Kitchen — Admin

An admin-only web app for tracking an ulam (viand) selling business:

- Log **market costs** (ingredients, supplies, other expenses)
- Set **food item pricing** (cost price and selling price per dish)
- Record **sales** and see **net income** (sales − costs) on a dashboard

### Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind CSS)
- [Prisma](https://www.prisma.io) + Postgres
- [Auth.js (NextAuth v5)](https://authjs.dev) — single admin login via credentials
- [Recharts](https://recharts.org) — dashboard chart

### 1. Set up a Postgres database

Any Postgres works, but [Neon](https://neon.tech) or [Vercel Postgres](https://vercel.com/storage/postgres) are the
easiest to pair with Vercel (free tier, works locally and in production with the same connection string).

Create a database and copy its connection string.

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` / `DIRECT_URL` — from your Postgres provider
- `AUTH_SECRET` — generate with `npx auth secret`
- `ADMIN_EMAIL` — the email you'll log in with
- `ADMIN_PASSWORD_HASH` — generate with:
  ```bash
  npm run hash-password -- yourPassword
  ```
  Paste the printed value into `.env` exactly as-is (it comes pre-escaped). Next.js expands
  unescaped `$name` sequences in `.env` values, which corrupts a raw bcrypt hash — the script
  escapes the `$` signs for you so this doesn't bite you.

There is only ever one admin account, defined entirely by these two env vars — no signup flow, no users table.

### 3. Install dependencies and push the schema

```bash
npm install
npm run db:push
```

### 4. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in with `ADMIN_EMAIL` / the password you hashed.

### Deploying to Vercel

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the same environment variables from your `.env` (`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`) in the Vercel project settings.
4. Deploy. The `build` script runs `prisma generate` automatically; run `npm run db:push` locally (pointed at the
   same production database) once to create the tables before first use.

### Notes

- Prices are stored/display in PHP (₱) by default — change the currency in [src/lib/money.ts](src/lib/money.ts) if needed.
- A `.npmrc` pinning the public npm registry is included because this machine's global npm config points at a
  private registry; it's safe to keep committed.
