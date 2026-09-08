-- Fix leaderboard(): current_stats picked the Totalbetyg row with the largest
-- scraped_at (source's self-reported dateModified), not the row we most
-- recently wrote. Those aren't the same thing -- the backfill's scraped_at
-- values came from old cron wall-clock times, which can sort *after* a
-- genuinely newer write's dateModified (same class of bug already fixed in
-- upsertSiteScores' dedup query, site.service.ts). Confirmed live: 20 sites
-- were showing a stale backfilled score/rank instead of their real latest.
--
-- current_stats now orders by created_at DESC (our own insert order) as
-- primary, matching the write-side fix. prev_stats is intentionally an
-- "as of N days ago" query and correctly stays ordered by scraped_at --
-- just adds created_at as a tiebreak for determinism.

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
    ORDER BY site_id, created_at DESC, scraped_at DESC
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
