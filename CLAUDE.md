# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # Run ESLint
```

## Database Migrations

SQL migration files live in `supabase/migrations/`. Run them in order in the Supabase SQL editor.

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Create `sites` and `scans` tables |
| `002_get_leaderboard_function.sql` | `get_leaderboard()` stored proc (used via RPC) |
| `003_sites_url_unique_constraint.sql` | Unique constraint on `sites.url` (required for upsert) |
| `004_scans_scanned_at_default.sql` | `scanned_at` NOT NULL + DEFAULT now() |
| `005_enforce_sites_constraints.sql` | NOT NULL + defaults on all `sites` columns |
| `006_enforce_scans_constraints.sql` | NOT NULL + defaults on all `scans` columns |

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=''
NEXT_PUBLIC_SUPABASE_ANON_KEY=''
SUPABASE_SERVICE_ROLE_KEY=''
TARGET_BOARD_URL=''
```

## Architecture

**WebPerf Scoreboard** tracks external website performance scores over time. A Vercel cron job scrapes a target scoreboard weekly, stores results in PostgreSQL, and displays a leaderboard with rank changes.

### Data Flow

1. **Cron** (`/api/cron/scrape`) triggers weekly (Sunday 00:00) — bearer token auth required in non-dev environments
2. **Scraper** ([src/lib/scraper.ts](src/lib/scraper.ts)) fetches `TARGET_BOARD_URL` with Cheerio, parses site names/scores/detail URLs, then scrapes each site's detail page for category breakdowns
3. **DB** upserts sites and inserts scan records — scores/categories stored as JSONB in `scans` table
4. **Homepage** ([src/app/page.tsx](src/app/page.tsx)) uses a CTE query to compute weekly rank changes (current vs. previous week)
5. **Detail page** ([src/app/site/[id]/page.tsx](src/app/site/[id]/page.tsx)) shows score history chart + last 52 scans

### Key Files

- [src/lib/supabase.ts](src/lib/supabase.ts) — Supabase admin client (service role, bypasses RLS)
- [src/lib/site.service.ts](src/lib/site.service.ts) — DB operations: leaderboard RPC, site upsert, scan insert, site history
- [src/lib/scraper.ts](src/lib/scraper.ts) — Cheerio-based scraper; CSS selectors here are the main customization point when the target site changes
- [src/lib/ratingColors.ts](src/lib/ratingColors.ts) — Score → Tailwind color mapping (Catppuccin palette); thresholds: ≥4.0 green, 2.5–4.0 peach, <2.5 red
- [src/components/Leaderboard.tsx](src/components/Leaderboard.tsx) — Client component; integrates `Search` for real-time row filtering
- [src/components/ScoreHistoryChart.tsx](src/components/ScoreHistoryChart.tsx) — Recharts `LineChart` for total + category score history

### Patterns

- UI primitives are shadcn/ui components (New York style) in [src/components/ui/](src/components/ui/)
- Path alias `@/*` maps to `src/*`
- Scores are stored and displayed as floats (0–5 scale); `scoreTextToFloat()` in [src/lib/utils.ts](src/lib/utils.ts) parses strings like `"(3.33 av 5)"`
- Leaderboard uses `"use cache"` + `cacheLife("hours")` — Next.js caches and revalidates hourly
