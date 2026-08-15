import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreCard } from "@/components/ScoreCard";
import { TestResultsCard } from "@/components/TestResultsCard";
import { ScanHistoryTable } from "@/components/ScanHistoryTable";
import { ScoreHistoryChart } from "@/components/ScoreHistoryChart";
import { Skeleton } from "@/components/ui/skeleton";
import { getSiteWithHistory } from "@/lib/site.service";
import { cacheLife, cacheTag } from "next/cache";

async function getCachedSiteWithHistory(id: string) {
  "use cache";
  cacheLife("days");
  cacheTag("site", `site:${id}`);
  return getSiteWithHistory(id);
}

export default function SiteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<SiteDetailsSkeleton />}>
      <SiteDetails params={params} />
    </Suspense>
  );
}

async function SiteDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { site, history } = await getCachedSiteWithHistory(id);

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

function SiteDetailsSkeleton() {
  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
