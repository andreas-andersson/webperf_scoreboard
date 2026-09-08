-- Structural fix for the "what's the latest row" ambiguity that caused two
-- real bugs (upsertSiteScores dedup, leaderboard() current_stats): scraped_at
-- (source's self-reported date) and created_at (our write order) aren't the
-- same thing, and any query that picks "latest" by sorting one of them can
-- silently pick the wrong row when backfilled/live data interleave.
--
-- Fix: one row per (site, metric/test) key, upserted -- "latest" becomes a
-- physical guarantee (the primary key), not a query convention. The existing
-- site_scores/site_tests tables keep serving as pure append-only history for
-- the chart; nothing reads them to answer "what's true right now" anymore.

CREATE TABLE IF NOT EXISTS site_scores_current (
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  score double precision,
  scraped_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, metric_name)
);

CREATE TABLE IF NOT EXISTS site_tests_current (
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  score double precision,
  tested_at date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, test_name)
);

-- Seed from history using the same created_at-DESC-primary tiebreak as the
-- fixed leaderboard() (009) -- our own write order wins over the source's
-- self-reported date, since backfilled rows' scraped_at isn't trustworthy
-- for this comparison.
INSERT INTO site_scores_current (site_id, metric_name, score, scraped_at, updated_at)
SELECT DISTINCT ON (site_id, metric_name) site_id, metric_name, score, scraped_at, created_at
FROM site_scores
ORDER BY site_id, metric_name, created_at DESC, scraped_at DESC
ON CONFLICT (site_id, metric_name) DO NOTHING;

INSERT INTO site_tests_current (site_id, test_name, score, tested_at, updated_at)
SELECT DISTINCT ON (site_id, test_name) site_id, test_name, score, tested_at, created_at
FROM site_tests
ORDER BY site_id, test_name, created_at DESC, tested_at DESC
ON CONFLICT (site_id, test_name) DO NOTHING;

-- leaderboard() v4: current state comes straight from site_scores_current --
-- no DISTINCT ON / ORDER BY tiebreak needed, the primary key already
-- guarantees one row per site. prev_stats is a genuine "as of N days ago"
-- query and correctly keeps reading history, ordered by scraped_at.
CREATE OR REPLACE FUNCTION leaderboard()
RETURNS TABLE (
  id uuid,
  name text,
  url text,
  total_score double precision,
  scanned_at timestamptz,
  current_rank bigint,
  rank_change bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH current_ranks AS (
    SELECT
      site_id, score AS total_score, scraped_at,
      RANK() OVER (ORDER BY score DESC NULLS LAST) AS current_rank
    FROM site_scores_current
    WHERE metric_name = 'Totalbetyg'
  ),
  prev_stats AS (
    SELECT DISTINCT ON (site_id)
      site_id, score AS total_score
    FROM site_scores
    WHERE metric_name = 'Totalbetyg'
      AND scraped_at <= now() - INTERVAL '7 days'
    ORDER BY site_id, scraped_at DESC, created_at DESC
  ),
  prev_ranks AS (
    SELECT *,
      RANK() OVER (ORDER BY total_score DESC NULLS LAST) AS prev_rank
    FROM prev_stats
  )
  SELECT
    sites.id,
    sites.name,
    sites.url,
    current_ranks.total_score,
    current_ranks.scraped_at AS scanned_at,
    current_ranks.current_rank,
    (prev_ranks.prev_rank - current_ranks.current_rank)::bigint AS rank_change
  FROM current_ranks
  JOIN sites ON sites.id = current_ranks.site_id
  LEFT JOIN prev_ranks ON prev_ranks.site_id = current_ranks.site_id
  ORDER BY current_ranks.current_rank ASC;
$$;
