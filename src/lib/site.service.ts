import { sql, eq, desc } from "drizzle-orm";
import { db, useReplica } from "@/db";
import { sites, scans } from "@/db/schema";

export async function getLeaderboard() {
  const query = sql`
    WITH unique_weekly_scans AS (
        SELECT DISTINCT ON (scans.site_id, date_trunc('week', scans.scanned_at))
            scans.id,
            scans.site_id,
            scans.total_score,
            scans.scanned_at,
            date_trunc('week', scans.scanned_at) as scan_week
        FROM ${scans}
        ORDER BY scans.site_id, date_trunc('week', scans.scanned_at), scans.scanned_at DESC
    ),
    weekly_ranks AS (
        SELECT
            id,
            site_id,
            total_score,
            scanned_at,
            scan_week,
            RANK() OVER (
                PARTITION BY scan_week
                ORDER BY total_score DESC NULLS LAST
            ) as current_rank
        FROM unique_weekly_scans
    ),
    latest_scan_date AS (
         SELECT MAX(scan_week) as max_week FROM weekly_ranks
    ),
    previous_scan_date AS (
         SELECT (max_week - INTERVAL '1 week') as prev_week FROM latest_scan_date
    ),
    current_stats AS (
        SELECT * FROM weekly_ranks
        WHERE scan_week = (SELECT max_week FROM latest_scan_date)
    ),
    prev_stats AS (
        SELECT * FROM weekly_ranks
        WHERE scan_week = (SELECT prev_week FROM previous_scan_date)
    )
    SELECT
        sites.id,
        sites.name,
        sites.url,
        current_stats.total_score,
        current_stats.scanned_at,
        current_stats.current_rank,
        (prev_stats.current_rank - current_stats.current_rank) as rank_change
    FROM current_stats
    JOIN ${sites} ON sites.id = current_stats.site_id
    LEFT JOIN prev_stats ON prev_stats.site_id = current_stats.site_id
    ORDER BY current_stats.current_rank ASC
  `;

  const result = await useReplica().execute(query);

  return result.rows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    totalScore: row.total_score as number,
    lastScanned: row.scanned_at
      ? new Date(row.scanned_at as string).toISOString()
      : "Never",
    rank: Number(row.current_rank),
    rankChange: row.rank_change ? Number(row.rank_change) : 0,
  }));
}

export async function getSiteWithHistory(id: string, limit = 52) {
  const site = await db.query.sites.findFirst({
    where: eq(sites.id, id),
  });

  const history = await db.query.scans.findMany({
    where: eq(scans.siteId, id),
    orderBy: [desc(scans.scannedAt)],
    limit,
  });

  return { site, history };
}

export async function upsertSite(url: string, name: string): Promise<string> {
  const existing = await db
    .select()
    .from(sites)
    .where(eq(sites.url, url))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const inserted = await db
    .insert(sites)
    .values({ url, name })
    .returning({ id: sites.id });

  return inserted[0].id;
}

export async function createScan(params: {
  siteId: string;
  totalScore: number | null;
  categories: Record<string, number>;
  testsData: Record<string, number>;
}) {
  await db.insert(scans).values(params);
}
