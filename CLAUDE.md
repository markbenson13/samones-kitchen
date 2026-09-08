@AGENTS.md

# Project conventions (SAMone's Kitchen)

Durable, non-obvious conventions this codebase relies on — read this before making changes, especially to Orders,
Sales, or dates. See [README.md](README.md) for the feature list and setup.

## Data model conventions

- **Order "batch" key is `orderGroupId ?? id`.** Every item a customer ordered in one submission shares one
  `orderGroupId`; rows created before that column existed have `orderGroupId: null` and are their own singleton
  batch (keyed by their own `id`). Never `groupBy("orderGroupId")` directly in Prisma for a batch count — it
  collapses every legacy `null` row into one group. Either dedupe a fetched row set in JS via
  `new Set(rows.map(r => r.orderGroupId ?? r.id))`, or use SQL `COUNT(DISTINCT COALESCE("orderGroupId", id))`
  (see the Dashboard's unpaid/pending aggregates in `src/app/(admin)/dashboard/page.tsx` for a worked example of
  the latter, verified to match the JS-dedup approach).
- **Sale rows accumulate; Orders never overwrite `quantityMade`.** A regular (non-Sale) order auto-contributes its
  quantity/revenue into that day's regular-price `Sale` row (`addRegularContribution` in
  `src/app/actions/orders.ts`) so nothing has to be logged twice — but it only ever adds to `quantity`/`totalAmount`,
  never touches `quantityMade` (that's a kitchen fact the admin owns). A Sale-tagged order instead transfers
  leftover out of the regular row (`reduceRegularMade`) exactly once. Deleting/editing an order reverses its
  contribution via the same pair of helpers, keyed by the order's own `isSale` value — never delete a regular
  Sale row automatically, even if its `quantity` reaches 0, since `quantityMade` may still hold real data.
- **Dates: local calendar day vs. UTC storage.** Date-only fields (`Sale.date`, `MarketCost.date`, `Order.date`,
  etc.) are stored as UTC midnight (`new Date("YYYY-MM-DD")` parses as UTC). `toDateInputValue()` in
  `src/lib/date.ts` gives the *local* calendar date (for defaulting a date picker to "today" as the shop owner
  sees it); `utcDateKey()` gives the UTC calendar date (for grouping/range math on stored values). Mixing them —
  e.g. `new Date()` truncated to UTC midnight instead of `new Date(toDateInputValue(new Date()))` — silently
  excludes today's own freshly-added rows for up to 8 hours after local midnight on a server ahead of UTC. Always
  parse a form's date input through `parseDateInput()` (throws on an unparseable string instead of writing an
  Invalid Date).

## UI conventions

- **Filter forms use `<FilterForm>` (`src/components/filter-form.tsx`), never a plain `<form>`.** A native GET
  form submit is a full browser page reload — which the browser visually freezes during, so no in-page loading
  indicator can ever show, no matter how slow the request is. `FilterForm` intercepts submission and does a
  client-side `router.push` instead, which the shared "Working…" overlay (`src/components/loading-overlay.tsx`)
  already knows how to show (same mechanism as `nav-progress.tsx`'s link-click tracking).
- **Every mutation goes through `useToast()` + `withToast()` (`src/components/toast.tsx`), never a thrown error
  left to hit `error.tsx`, and never a bare inline "✓ Saved" string.** `withToast(toast, fn, successMessage)` runs
  `fn`, shows `successMessage` on success, shows the thrown error's message on failure, and returns whether it
  succeeded — callers use that boolean to gate follow-up UI (closing an edit form, clearing a selection) so a
  failed action doesn't look like it succeeded.
- **Edit/Delete row actions are icon buttons** (`lucide-react`'s `Pencil`/`Trash2`, with `aria-label`/`title`), not
  text — this was a deliberate choice across all 5 CRUD tables (Orders/Sales/Market Costs/Expenses/Food Items).
  Other row actions ("+ Add item", "Delete order", bulk-bar buttons) intentionally stayed as text.
- **A form component that only mounts once its section is expanded must seed its "synced" tracking state with
  `null`, not the incoming prop.** Seeding with the prop works fine when the form is always mounted, but breaks
  the moment it's wrapped in a collapsible section that can mount directly into an already-in-progress edit — the
  sync guard (`if (prop && prop !== synced)`) never fires because `synced` started out already equal to `prop`.

## Testing convention

- `npm test` runs Vitest unit tests for pure helpers in `src/lib` (currently `date.ts`, `money.ts`). There is no
  e2e suite. Everything else (Server Actions, pages, auth) is verified by hand: create a throwaway user via
  `npm run create-user -- "email" "password"`, drive it with an ad-hoc Playwright script, then delete the test
  data afterward (a small `scripts/_cleanup-*.mjs` using `PrismaPg`/`PrismaClient` — a bare `new PrismaClient()`
  fails with "a driver adapter is required" in this project) before deleting the cleanup script itself.
- After changing anything under `src/app/actions/*.ts` or adding a new route file, clear `.next` and restart
  `next dev` before testing — this project's dev server has repeatedly not picked up such changes via HMR alone.

## Keeping docs in sync

If you add a page/feature area, a new env var, or a new script, update [README.md](README.md)'s feature list /
setup steps to match — it documents the app as it actually behaves, not as it originally shipped.
