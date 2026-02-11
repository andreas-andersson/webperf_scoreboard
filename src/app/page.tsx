import { sql } from "drizzle-orm";
import { ArrowUpRight } from "lucide-react";
import { useReplica } from "@/db";
import { sites, scans } from "@/db/schema";
import { Leaderboard } from "@/components/Leaderboard";
import {
  Card,
  CardContent
} from "@/components/ui/card";

export const dynamic = "force-dynamic"; // Ensure we get fresh data

export default async function Home() {
  // CTE to calculate ranks per week
  const leaderboardQuery = sql`
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
        -- Simple logic: "Previous" is strictly 1 week ago, or the simple distinct previous week
        -- For robustness with sparse data, we might need dense_rank on weeks, but interval works for weekly crons.
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

  const result = await useReplica().execute(leaderboardQuery);

  const leaderboard = result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    totalScore: row.total_score,
    lastScanned: row.scanned_at
      ? new Date(row.scanned_at).toLocaleDateString()
      : "Never",
    rank: Number(row.current_rank),
    rankChange: row.rank_change ? Number(row.rank_change) : 0,
  }));

  return (
    <main className="container mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row sm:items-end mb-6 gap-4">
        <div className="header">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
              Webperf: <a href="https://webperxf.se/category/kommuner/" target="_blank" className="hover:text-primary transition-colors inline-flex flex-row">Municipalities <ArrowUpRight size={16} /></a>
            </span>
            <h1 className="text-3xl md:text-4xl font-bold mb-0 font-mono tracking-tight uppercase w-100 sm:w-min lg:w-max">
              Municipality scoreboard
            </h1>
        </div>
        <p className="hidden sm:block text-xs text-muted-foreground sm:pl-4">A ranking of municipalities based on their web performance scores, with historical comparisons.</p>
      </div>
      <Card className="border-border">
        <CardContent>
          <Leaderboard leaderboard={leaderboard} />
        </CardContent>
      </Card>
    </main>
  );
}
