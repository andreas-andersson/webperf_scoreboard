-- New leaderboard(), reads from site_scores (Totalbetyg) instead of scans.
-- Rank-change uses a fixed 7-day lookback instead of ISO-week bucketing,
-- since site_scores updates on an irregular cadence.
-- Old get_leaderboard() (002_get_leaderboard_function.sql) is left untouched
-- so the live site keeps working unchanged until callers are switched over.

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
  WITH current_stats AS (
    SELECT DISTINCT ON (site_id)
      site_id, score AS total_score, scraped_at
    FROM site_scores
    WHERE metric_name = 'Totalbetyg'
    ORDER BY site_id, scraped_at DESC
  ),
  current_ranks AS (
    SELECT *,
      RANK() OVER (ORDER BY total_score DESC NULLS LAST) AS current_rank
    FROM current_stats
  ),
  prev_stats AS (
    SELECT DISTINCT ON (site_id)
      site_id, score AS total_score
    FROM site_scores
    WHERE metric_name = 'Totalbetyg'
      AND scraped_at <= now() - INTERVAL '7 days'
    ORDER BY site_id, scraped_at DESC
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
