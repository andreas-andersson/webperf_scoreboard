import { db } from "@/db";
import { sites, scans } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ScoreHistoryChart } from "@/components/ScoreHistoryChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getScoreColor } from "@/lib/ratingColors";
import { cacheLife } from "next/cache";

export const dynamic = "force-dynamic";

export default async function SiteDetailsPage({params,}: {params: Promise<{ id: string }>;}) {
  "use cache";
  cacheLife("hours");

  const { id } = await params;

  const site = await db.query.sites.findFirst({
    where: eq(sites.id, id),
  });

  if (!site) {
    notFound();
  }

  const history = await db.query.scans.findMany({
    where: eq(scans.siteId, id),
    orderBy: [desc(scans.scannedAt)],
    limit: 52
  });

  // TODO: Render a no scan history state instead of 404
  if (history.length === 0) {
    notFound();
  }

  const currentScore = history[0];

  const categoriesCurrent = currentScore?.categories as Record<string, number>;

  const allCategories = new Set<string>();

  const chartData = history.map((scan) => {
    const categories = (scan.categories as Record<string, number>) || {};
    Object.keys(categories).forEach((k) => allCategories.add(k));

    return {
      date: new Date(scan.scannedAt).toISOString().split("T")[0],
      score: scan.totalScore || 0,
      ...categories,
    };
  }).reverse(); // Reverse for chronological order

  const categoryNames = Array.from(allCategories);

  // Reverse for table view (newest first)
  const tableData = [...history];

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight uppercase">
            {site.name}
          </h1>
          <a
            href={
              site.url.startsWith("http") ? site.url : `https://${site.url}`
            }
            target="_blank"
            className="font-mono text-sm text-muted-foreground hover:underline hover:text-primary transition-colors"
          >
            {site.url}
          </a>
        </div>
        <a
          href="/"
          className="px-4 py-2 border border-input bg-background hover:bg-muted font-mono text-sm uppercase"
        >
          Back to Board
        </a>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-mono uppercase">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
                <Badge
                  className={`text-lg px-3 py-1 ${getScoreColor(currentScore.totalScore)} rounded-none border-0`}
                >
                  {currentScore.totalScore?.toFixed(2)}
                </Badge>
            </div>
          </CardContent>
        </Card>
        { Object.entries(categoriesCurrent).map( ([categoryName, categoryScore]) => {
          return (
            <Card key={categoryName} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium font-mono uppercase">
                  {categoryName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">
                  <Badge
                    className={`text-lg px-3 py-1 ${getScoreColor(categoryScore)} rounded-none border-0`}
                  >
                    {categoryScore?.toFixed(2)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-mono uppercase tracking-tight">
            Latest Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 font-mono text-sm">
            {Object.entries(
              currentScore.testsData as Record<string, any>,
            ).map(([key, value]) => (
              <div
                key={key}
                className="flex justify-between items-center border-b border-border/40 pb-2"
              >
                <span className="text-muted-foreground">{key}</span>
                <span
                  className={
                    typeof value === "number"
                      ? `font-bold ${value >= 4 ? "text-[#a6e3a1]" : value >= 2.5 ? "text-[#fab387]" : "text-[#f38ba8]"}`
                      : ""
                  }
                >
                  {typeof value === "number"
                    ? value.toFixed(2)
                    : String(value)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ScoreHistoryChart data={chartData} categories={categoryNames} />

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-mono uppercase tracking-tight">
            Scan History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50 border-border">
                <TableHead className="font-mono uppercase text-xs">
                  Date
                </TableHead>
                <TableHead className="font-mono uppercase text-xs">
                  Total Score
                </TableHead>
                <TableHead className="font-mono uppercase text-xs">
                  Category Breakdown
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((scan) => (
                <TableRow
                  key={scan.id}
                  className="hover:bg-muted/30 border-border"
                >
                  <TableCell className="font-mono text-muted-foreground">
                    {new Date(scan.scannedAt).toISOString().split("T")[0]}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`font-mono rounded-none border-0 ${getScoreColor(scan.totalScore)}`}
                    >
                      {scan.totalScore?.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(
                        (scan.categories as Record<string, number>) || {},
                      ).map(([k, v]) => (
                        <span
                          key={k}
                          className="font-mono border border-border px-2 py-0.5 text-[10px] uppercase"
                        >
                          {k}:{" "}
                          <span
                            className={
                              v >= 4
                                ? "text-[#a6e3a1]"
                                : v >= 2.5
                                  ? "text-[#fab387]"
                                  : "text-[#f38ba8]"
                            }
                          >
                            {v.toFixed(2)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
