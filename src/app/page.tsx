import { db } from '@/db';
import { sites, scans } from '@/db/schema';
import { sql } from 'drizzle-orm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from 'next/link';
import {  ArrowUp, ArrowDown, Minus } from "lucide-react";

function getScoreColor(score: number | null) {
    if (score === null) return "bg-[#6c7086] hover:bg-[#585b70]"; // Overlay0
    if (score >= 4.0) return "bg-[#a6e3a1] hover:bg-[#94e2d5] text-[#1e1e2e]"; // Green -> Teal hover
    if (score >= 2.5) return "bg-[#fab387] hover:bg-[#f9e2af] text-[#1e1e2e]"; // Peach -> Yellow hover
    return "bg-[#f38ba8] hover:bg-[#eba0ac] text-[#1e1e2e]"; // Red -> Maroonish hover
}

function TrendIndicator({ trend }: { trend: number }) {
  if (trend > 0) {
    return (
      <div className="flex items-center text-[#a6e3a1] gap-1">
        <ArrowUp className="h-4 w-4" />
        <span>{trend}</span>
      </div>
    );
  }
  if (trend < 0) {
    return (
      <div className="flex items-center text-[#f38ba8] gap-1">
        <ArrowDown className="h-4 w-4" />
        <span>{Math.abs(trend)}</span>
      </div>
    );
  }
  return <Minus className="h-4 w-4 text-[#a6adc8]" />;
}

export const dynamic = 'force-dynamic'; // Ensure we get fresh data

export default async function Home() {
    
  // CTE to calculate ranks per week
  const leaderboardQuery = sql`
    WITH weekly_ranks AS (
        SELECT 
            scans.id,
            scans.site_id,
            scans.total_score,
            scans.scanned_at,
            RANK() OVER (
                PARTITION BY date_trunc('week', scans.scanned_at) 
                ORDER BY scans.total_score DESC NULLS LAST
            ) as current_rank,
            date_trunc('week', scans.scanned_at) as scan_week
        FROM ${scans}
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

  const result = await db.execute(leaderboardQuery);

  const leaderboard = result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    totalScore: row.total_score,
    lastScanned: row.scanned_at ? new Date(row.scanned_at).toLocaleDateString() : 'Never',
    rank: Number(row.current_rank),
    rankChange: row.rank_change ? Number(row.rank_change) : 0,
  }));

  return (
    <main className="container mx-auto py-10 px-4">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">WEBPERF SCOREBOARD</CardTitle>
          <CardDescription className="text-muted-foreground font-mono text-xs">
            TRACKING PERFORMANCE METRICS [0.0 - 5.0]
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50 border-border">
                <TableHead className="w-[80px]">RANK</TableHead>
                <TableHead className="w-[80px]">TREND</TableHead>
                <TableHead>SITE NAME</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="text-right">SCORE</TableHead>
                <TableHead className="text-right">LAST SCANNED</TableHead>
                <TableHead className="text-right">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.length === 0 && (
                <TableRow>
                   <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                     NO DATA AVAILABLE
                   </TableCell>
                </TableRow>
              )}
              {leaderboard.map((site) => (
                <TableRow key={site.id} className="font-mono hover:bg-muted/30 border-border">
                  <TableCell className="font-medium">#{site.rank}</TableCell>
                  <TableCell>
                    <TrendIndicator trend={site.rankChange} />
                  </TableCell>
                  <TableCell className="font-bold">{site.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    <a 
                      href={site.url.startsWith('http') ? site.url : `https://${site.url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {site.url}
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={`font-mono border-0 rounded-none ${getScoreColor(site.totalScore)}`}>
                        {site.totalScore?.toFixed(2) ?? 'N/A'}
                    </Badge>
                  </TableCell>
                   <TableCell className="text-right text-xs text-muted-foreground">
                        {site.lastScanned !== 'Never' 
                            ? new Date(site.lastScanned).toISOString().split('T')[0] 
                            : 'NEVER'}
                   </TableCell>
                  <TableCell className="text-right text-xs">
                    <Link href={`/site/${site.id}`} className="text-primary hover:underline uppercase">
                        [DETAILS]
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
