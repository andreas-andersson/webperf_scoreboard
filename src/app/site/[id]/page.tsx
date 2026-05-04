import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreCard } from "@/components/ScoreCard";
import { TestResultsCard } from "@/components/TestResultsCard";
import { ScanHistoryTable } from "@/components/ScanHistoryTable";
import { ScoreHistoryChart } from "@/components/ScoreHistoryChart";
import { getSiteWithHistory } from "@/lib/site.service";
import { cacheLife, cacheTag } from "next/cache";


export default async function SiteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  "use cache";
  const { id } = await params;
  cacheLife("days");
  cacheTag("site", `site:${id}`);

  const { site, history } = await getSiteWithHistory(id);

  if (!site || !history || history.length === 0) notFound();

  const currentScore = history[0];
  const categoriesCurrent = currentScore.categories as Record<string, number>;
  const allCategories = new Set<string>();
  const allTestsKeys = new Set<string>();

  const chartData = history.map((scan) => {
    const categories = (scan.categories as Record<string, number>) || {};
    const testsData = (scan.testsData as Record<string, unknown>) || {};
    for (const k of Object.keys(categories)) allCategories.add(k);
    const numericTests: Record<string, number> = {};
    for (const [k, v] of Object.entries(testsData)) {
      if (typeof v === "number") {
        numericTests[k] = v;
        allTestsKeys.add(k);
      }
    }
    return {
      date: new Date(scan.scannedAt).toISOString().split("T")[0],
      score: scan.totalScore || 0,
      ...categories,
      ...numericTests,
    };
  }).reverse();

  const categoryNames = Array.from(allCategories);
  const testsKeyNames = Array.from(allTestsKeys);

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight uppercase">
            {site.name}
          </h1>
          <a
            href={site.url.startsWith("http") ? site.url : `https://${site.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-muted-foreground hover:underline hover:text-primary transition-colors"
          >
            {site.url}
          </a>
        </div>
        <Link
          href="/"
          className="px-4 py-2 border border-input bg-background hover:bg-muted font-mono text-sm uppercase"
        >
          Back to Board
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <ScoreCard label="Total" score={currentScore.totalScore} />
        {Object.entries(categoriesCurrent).map(([name, score]) => (
          <ScoreCard key={name} label={name} score={score} />
        ))}
      </div>

      <TestResultsCard
        testsData={(currentScore.testsData as Record<string, unknown>) || {}}
      />

      <ScoreHistoryChart
        data={chartData}
        categories={categoryNames}
        testsKeys={testsKeyNames}
      />

      <ScanHistoryTable history={history} />
    </div>
  );
}
