# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # Run ESLint
```

## Database Migrations

SQL migration files live in `database/migrations/`. Run them in order against `DATABASE_URL`. (Directory used to be named `supabase/` — this project has moved Neon → Supabase → plain Postgres; renamed since nothing here is Supabase-specific anymore.)

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Create `sites` and `scans` tables |
| `002_get_leaderboard_function.sql` | `get_leaderboard()` stored proc — superseded by `leaderboard()` (008), kept only as a rollback net |
| `007_site_tests_and_scores.sql` | Create `site_tests` (per-test, deduped by `tested_at`) and `site_scores` (Totalbetyg + categories, deduped by value) |
| `008_leaderboard_function.sql` | `leaderboard()` — reads `site_scores`, fixed 7-day-lookback rank change instead of week-bucketing |

> Migrations `003`–`006` (unique constraint on `sites.url`, `scanned_at` default, NOT NULL/defaults on both tables) were applied directly against the old Supabase instance and never saved as files here. Reconstruct them from `001`/`002` plus this history before standing up a fresh database — data migration and schema parity are not done yet.

## Environment Variables

Required in `.env.local`:
```
TARGET_BOARD_URL=''
DATABASE_URL=''
CRON_SECRET=''
```

## Architecture

**WebPerf Scoreboard** tracks external website performance scores over time. A Vercel cron job scrapes a target scoreboard daily, stores only what changed in PostgreSQL (change-detected per test/metric), and displays a leaderboard with rank changes.

### Data Flow

1. **Cron** (`/api/cron/scrape`) triggers daily (00:00) — bearer token auth required in non-dev environments
2. **Scraper** ([src/lib/scraper.ts](src/lib/scraper.ts)) fetches `TARGET_BOARD_URL` with Cheerio, parses site names/scores/detail URLs, then scrapes each site's detail page for category breakdowns
3. **DB** upserts sites, then writes change-detected rows: `site_scores` (Totalbetyg + the 4 categories, deduped by value change) and `site_tests` (individual tests, deduped by their own `tested_at` date scraped from the source's JSON-LD). A cron run with nothing new upstream writes nothing.
4. **Homepage** ([src/app/page.tsx](src/app/page.tsx)) calls the `leaderboard()` SQL function — current vs. a fixed 7-day-lookback snapshot for rank change (not week-bucketing; `site_scores` updates on an irregular cadence)
5. **Detail page** ([src/app/site/[id]/page.tsx](src/app/site/[id]/page.tsx)) shows score history chart + reconstructed per-change-date history (carry-forward snapshots built from `site_scores`/`site_tests`, see `getSiteWithHistory`)

The old `scans` table + `get_leaderboard()` function are no longer read by any code path — kept only as a rollback net, not yet dropped.

### Key Files

- [src/lib/db.ts](src/lib/db.ts) — `pg` connection pool (reused across invocations)
- [src/lib/site.service.ts](src/lib/site.service.ts) — DB operations: leaderboard (`leaderboard()` RPC), site upsert, `site_scores`/`site_tests` change-detected writes, site history reconstruction
- [src/lib/scraper.ts](src/lib/scraper.ts) — Cheerio-based scraper; CSS selectors here are the main customization point when the target site changes
- [src/lib/ratingColors.ts](src/lib/ratingColors.ts) — Score → Tailwind color mapping (Catppuccin palette); thresholds: ≥4.0 green, 2.5–4.0 peach, <2.5 red
- [src/components/Leaderboard.tsx](src/components/Leaderboard.tsx) — Client component; integrates `Search` for real-time row filtering
- [src/components/ScoreHistoryChart.tsx](src/components/ScoreHistoryChart.tsx) — Recharts `LineChart` for total + category score history

### Patterns

- UI primitives are shadcn/ui components (New York style) in [src/components/ui/](src/components/ui/)
- Path alias `@/*` maps to `src/*`
- Scores are stored and displayed as floats (0–5 scale); `scoreTextToFloat()` in [src/lib/utils.ts](src/lib/utils.ts) parses strings like `"(3.33 av 5)"`
- Leaderboard uses `"use cache"` + `cacheLife("hours")` — Next.js caches and revalidates hourly

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
