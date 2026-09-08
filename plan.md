# Refactor: change-detected scans (site_tests / site_scores)

## Problem

Cron scrapes weekly, writes one full `scans` row per site every run regardless of
whether anything actually changed upstream. Source tests update ~monthly on an
unpredictable date. Result: noisy history, wasted rows, fragile week-bucketed
rank-change math.

## Decisions made

- **Granularity: per-test.** Not just per-site change detection — track each
  individual test's own `tested_at` date, so a single test updating doesn't
  force-write unrelated unchanged tests.
- **Two tables, two dedup strategies:**
  - `site_tests` — individual tests (HTML, CSS, etc). Real `tested_at` date
    from source. Dedup key: `(site_id, test_name, tested_at)`.
  - `site_scores` — Totalbetyg + 4 categories (Tillgänglighet, Hastighet,
    Webbstandard, Integritet & säkerhet). These are an opaque combination of
    the underlying tests — no reliable per-item source date. Dedup by
    **value change**, not date. Safe to scrape/write daily.
- **Rank-change comparison:** fixed lookback window (current vs ~7 days ago),
  replacing ISO-week bucketing which doesn't hold up under irregular cadence.
- **Backfill:** convert old `scans` rows into the new tables. Dates on
  backfilled rows are approximate (`scanned_at` of the old row, not a true
  source date) — acceptable, goal is preserving historical score values, not
  historical accuracy of dates. Collapse consecutive-equal-value runs per
  `(site, metric/test)` during backfill so history starts clean.
- Old `scans` table: left untouched until backfill is verified against it.
  Drop later, as a separate follow-up.

## Steps

- [x] Explore current schema/scraper/service/leaderboard query/chart
- [x] Agree on schema + dedup strategy
- [x] Migration `007_site_tests_and_scores.sql` — create `site_tests` + `site_scores`
- [x] Backfill script (`scripts/backfill-site-tests-and-scores.ts`, `npm run backfill:site-tests-and-scores`) — written, not yet run against DB
- [x] Run migration `007` against `DATABASE_URL`
- [x] Run backfill script against `DATABASE_URL` — 10730 scans → 16202 site_scores + 18491 site_tests (303 sites)
- [x] Verify backfill (row counts, spot-check a site vs old `scans` data) — sane values, Swedish names intact
- [x] Scraper: extract real per-test `tested_at` date — found a JSON-LD block (`script[type=application/ld+json]`, `mainEntity.variableMeasured`) with exact `{name, value, observationDate}` per test, far more reliable than nav-toc scraping. Also exposes `mainEntity.dateModified` for the aggregate scores. `scraper.ts` now returns `tests` + `dateModified` alongside the existing `categories`/`testsData` (kept for the legacy `createScan` dual-write).
- [x] `site.service.ts`: added `upsertSiteScores` (value-dedup) + `upsertSiteTests` (date-dedup, `ON CONFLICT DO NOTHING`). **Bug found + fixed during smoke testing:** dedup was comparing against the row with the largest `scraped_at`, but `scraped_at`/`dateModified` isn't guaranteed monotonic against insert order (bit across the backfill boundary, where backfilled rows carry old cron wall-clock times) — fixed to compare against the most-recently-*written* row (`created_at DESC`) instead. Verified with an isolated reproduction of the exact boundary case.
- [x] Cron route (`/api/cron/scrape`): dual-writes — keeps the legacy `createScan` call (so leaderboard/detail page keep working unchanged) and additionally writes `site_scores`/`site_tests`. Drop the legacy call once leaderboard + detail page are repointed at the new tables (next step).
- [x] New `leaderboard()` SQL function (`008_leaderboard_function.sql`) — fixed 7-day-lookback rank-change, reads `site_scores` (Totalbetyg). Old `get_leaderboard()` left untouched/still in use — production stays on it until `site.service.ts` is switched over.
- [x] Switch `site.service.ts` `getLeaderboard()` to call `leaderboard()` instead of `get_leaderboard()` — verified live via dev server, homepage renders real leaderboard data (Eskilstuna kommun #1). Old `get_leaderboard()` SQL function left in place, unused, harmless.
- [x] `getSiteWithHistory` (site.service.ts): rewritten to read `site_scores` + `site_tests`, reconstruct one carry-forward snapshot per distinct date anything changed (no more single "scan" row per source). Verified live via dev server on Gävle kommun detail page — categories, tests, Total score card, and history table all render correctly with real per-change dates.
- [x] Dropped legacy `createScan` dual-write from cron route + deleted the now-dead `createScan` function from `site.service.ts`.
- [x] Ran cron for real (290 sites) against production DB, twice. **Found + fixed a second dedup bug in the process:** the backfill wrote all its historical rows inside one transaction, and Postgres's `now()` is fixed for the whole transaction — so every backfilled row for a given site+metric shared an identical `created_at`. My earlier `ORDER BY created_at DESC` fix ties on all of them, and Postgres breaks ties arbitrarily, occasionally surfacing a stale historical value as "latest" and causing spurious inserts (caught live: run 2 wrote 213 bogus rows). Fixed with a compound sort — `created_at DESC, scraped_at DESC` — verified against both boundary scenarios with repeated isolated tests (5x and 3x fresh reproductions), then cleaned the 581 polluted rows and reran cron clean: run A wrote 299 real changes, run B wrote **zero** (fully silent, dedup confirmed correct at real scale).
- [x] **Bug found + fixed:** `leaderboard()`'s `current_stats` CTE picked the Totalbetyg row with the largest self-reported `scraped_at`, not the row we most recently wrote — same failure class as the write-side dedup bug, just never applied here. Backfilled rows' `scraped_at` (old cron wall-clock, varies through the day) frequently sorted *after* real `dateModified` values (clustered ~01:47 UTC, the source's own daily recompute time), so the board kept showing stale scores/ranks even with fresh data underneath. **230 of 302 sites affected.** Fixed in `database/migrations/009_leaderboard_latest_by_created_at.sql` (current_stats now orders by `created_at DESC` primary; prev_stats correctly keeps `scraped_at` primary — it's intentionally an as-of-N-days-ago query — with `created_at` added as a tiebreak). Verified against the live webperf.se board: exact match on top 5.
- [x] **Structural fix, not just a query fix:** added `site_scores_current` + `site_tests_current` (PK = site_id+metric/test name, one row per key, upserted). "Latest" is now a physical guarantee — no code anywhere picks "latest" by sorting a date column, so the whole bug class (write dedup, `leaderboard()`, and the still-latent `getSiteWithHistory` risk) is closed structurally, not patched per-callsite. Write path (`upsertSiteScores`/`upsertSiteTests`) is now a single atomic `INSERT ... ON CONFLICT DO UPDATE ... WHERE <changed> RETURNING` feeding straight into the history-log insert — no more SELECT-then-compare, no race window. `leaderboard()` v4 reads `site_scores_current` directly for "now" (prev_stats correctly still reads history — that's a genuine as-of-N-days-ago query). `getSiteWithHistory`'s top-of-page "current" cards now read `*_current` instead of `history[0]`; the history walk still only feeds the chart timeline. Migration `010_current_state_tables.sql` — tables + seed (same created_at-DESC-primary tiebreak as the 009 fix) + `leaderboard()` v4, applied and verified: seed counts sane, top 5 matches live webperf.se board, ran cron twice for real against 290 sites — both runs fully silent (correctly no-op, no flakiness), detail page shows correct current values (Gävle 4.77).
- [ ] Drop old `scans` table + `get_leaderboard()` — **blocked until the updated app is deployed to production and confirmed working there.** Not read by any code path, safe to leave in the meantime as a rollback net.

## Open items for later

- Whether `site_scores` cadence actually goes daily in the cron schedule (currently weekly) — infra/vercel.json cron change, not blocking the schema work.
- CLAUDE.md migrations `003`-`006` gap (unique constraint on `sites.url`, defaults) — needs reconstructing before a fresh DB stands up; existing prod DB already has these applied directly.
