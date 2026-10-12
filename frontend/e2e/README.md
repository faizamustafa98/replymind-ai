# End-to-end tests (Playwright)

Browser-driven regression suite for the auth, onboarding, knowledge-base and
analytics flows, plus a set of backend API contract checks.

Test names carry the ID from the QA tracker (`AUTH-01`, `KB-05`, `ANLY-07`, …)
so a run maps one-to-one onto the test-case register.

## Setup

The suite creates and deletes its own Supabase accounts, so it needs the service
key. Put it in `.env.test` (gitignored — never commit it):

```
SUPABASE_SERVICE_KEY=sb_secret_...
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are read from the
existing `.env`.

Install browsers once:

```bash
npx playwright install chromium
```

## Running

```bash
npm run test:e2e           # full suite against the deployed app
npm run test:e2e:ui        # interactive runner
npm run test:e2e:report    # open the last HTML report
```

By default the suite targets the deployed site. Override the targets to run it
against a local dev server or a different backend:

```bash
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
E2E_API_URL=http://localhost:8000 npm run test:e2e
```

## How accounts work

Two fixtures cover every routing case:

| Fixture | Account state | Where it lands after sign-in |
| --- | --- | --- |
| `freshUser` | no setup flags | `/verify` — held at the email-code step |
| `setUpUser` | verified + onboarded | `/inbox` — behaves like an existing customer |

Both are created before the test and deleted after it, so runs are repeatable
and never touch real customer data. The email code is read straight from
Supabase's admin API rather than a real inbox, so no mail delivery is required.

Concurrency is capped at 2 workers: Supabase rate-limits sign-in attempts per
project, and above that specs start failing on the throttle instead of on real
behaviour.

## Known failures

`ANLY-04b` is marked `test.fail()` — it documents BUG-5, where the analytics
channel chart is hardcoded in `BarChart.tsx` instead of reading real data. When
that bug is fixed the spec will start passing, which Playwright reports as a
failure; that's the cue to drop the `test.fail()` marker and close the bug.
