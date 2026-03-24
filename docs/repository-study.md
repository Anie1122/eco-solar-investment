# Repository Study: Eco Solar Investment

_Date: 2026-03-24_

## 1) Executive overview

This repository is a **Next.js 15 App Router** project for a fintech-like solar investment platform. The product combines:

- A user-facing dashboard and portfolio workflow.
- Transaction flows for deposits, investments, withdrawals, airtime/data purchase, and referral logic.
- A backend implemented mainly as Next.js API routes.
- A mixed data/integration stack that includes **Supabase** (core auth/database), plus Firebase client utilities retained in parts of the codebase.
- AI-assisted UX via Genkit/Google GenAI endpoints and UI widgets.

## 2) Tech stack and runtime profile

### Framework and language

- Next.js `15.5.9`, React `19.2.1`, TypeScript `5`.
- Tailwind CSS + shadcn/Radix UI ecosystem for interface composition.

### Data and auth

- Supabase client and admin helpers are used for authenticated app reads and privileged backend writes.
- Route handlers use service-role powered access for investment, transaction, and notification mutation paths.

### Additional capabilities

- Genkit + Google GenAI dependencies and AI route/widget integration.
- Utility packages for export/receipt generation (`jspdf`, `html2canvas`) and animated UX (`framer-motion`).

## 3) Repository shape

High-level inventory (as currently present):

- `22` page entries under `src/app/**/page.tsx`.
- `22` route handlers under `src/app/api/**/route.ts`.
- `57` components under `src/components/**`.

Structural highlights:

- `src/app/` contains dashboard pages, auth pages, admin pages, and API routes.
- `src/lib/` centralizes business logic and integration helpers (currency, plans, Supabase admin/client, auth extraction, support chat, etc.).
- `src/components/` includes shared UI primitives and product widgets (wallet, transaction history, notifications, AI suggestions, floating actions).
- `docs/` includes a product blueprint and backend entity schema draft.

## 4) Key product flows found in code

### Deposit flow

- `POST /api/deposits/create` validates user token + amount values.
- Creates a `transactions` row with `transaction_type = deposit` and `status = pending`.
- Stores request context in `metadata` (payment method, currency conversion, optional receipt placeholders).

### Investment flow

- `POST /api/invest` validates bearer token, plan id, and wallet sufficiency.
- Uses locally-defined `investmentPlans` seed data for plan economics.
- Immediately updates wallet with investment deduction + first-day profit (+ signup bonus unlock where applicable).
- Inserts investment and transaction rows and creates in-app notifications.

### Profit credit automation

- `GET /api/cron/credit-profits?secret=...` checks `CRON_SECRET`.
- Marks matured investments complete before profit run.
- Executes RPC `credit_due_profits` and, where provided by RPC output, emits per-user credit notifications.

### Withdrawal flow

- `POST /api/withdrawals/request` enforces profile completion and a 4-digit withdrawal PIN.
- Applies brute-force lockout after repeated failures.
- Supports both crypto and bank payout destinations.
- Converts bank-amount requests to USDT using an internal rate map and enforces minimum threshold checks.
- Debits wallet, records pending withdrawal transaction, and emits notification.

## 5) Architecture observations

1. **Supabase-first backend path**
   - Business-critical operations are concentrated in server route handlers with service-role access.

2. **Dual-platform residue (Supabase + Firebase)**
   - Code still includes Firebase types/providers and Firestore-oriented type fields in shared model definitions.
   - This appears to be transitional architecture and may introduce maintenance ambiguity.

3. **Notification strategy**
   - A repeated “safe insert with fallback minimal payload” pattern exists in multiple routes, indicating schema drift tolerance.

4. **Plan and rate constants in app code**
   - Investment plans and FX-like conversion constants are hard-coded in TypeScript, simplifying bootstrapping but increasing operational risk if values need frequent updates.

## 6) Risks and improvement opportunities

### Security and compliance

- Ensure all routes using service-role semantics are never callable without robust auth + authorization checks.
- Consider centralized policy helpers to avoid drift between route handlers.

### Monetary correctness

- Hard-coded local payout conversion table should be externalized to a controlled source (or admin-managed table), with timestamped updates.
- Consider introducing a shared money/decimal utility for exact arithmetic and explicit rounding policy.

### Domain integrity

- Co-locate plan definitions in database/config tables so business users can update plans without redeploy.
- Add DB constraints and server-side idempotency guards for transaction creation under retries.

### Operational reliability

- Consolidate notification insert fallback logic into one helper.
- Add explicit observability around cron credit runs (counts, errors, duration, retries).

### Codebase clarity

- Finish migration path: either remove remaining Firebase-oriented types/hooks or define a strict split of responsibilities between Firebase client utilities and Supabase domain backend.

## 7) Suggested next actions (prioritized)

1. Introduce a single `money.ts` utility with deterministic rounding and conversion contracts.
2. Move payout rates and investment plans to managed storage (Supabase table + admin page).
3. Create shared server auth/authorization guards for API routes.
4. Add integration tests for invest/deposit/withdrawal happy-path + failure-path cases.
5. Standardize notification creation helper and remove duplicated fallback snippets.
6. Document runtime env requirements in README (`NEXT_PUBLIC_SUPABASE_URL`, anon key, service role key, cron secret).

## 8) Conclusion

The repository is already a feature-rich product codebase with substantial end-user functionality and administrative operations. The primary technical leverage now is in **hardening financial correctness**, **centralizing mutable business config**, and **reducing architecture ambiguity** between legacy Firebase artifacts and the active Supabase backend path.
