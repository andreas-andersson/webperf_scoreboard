import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { LeaderboardLoader } from "@/components/LeaderboardLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2 pt-2">
      <Skeleton className="h-8 w-48 mb-4" />
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}

export default async function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <div className="flex flex-col sm:flex-row sm:items-end mb-6 gap-4">
        <div className="header">
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-mono">
            Webperf:{" "}
            <a
              href="https://webperf.se/category/kommuner/"
              target="_blank"
              className="hover:text-primary transition-colors inline-flex flex-row"
            >
              Municipalities <ArrowUpRight size={16} />
            </a>
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-0 font-mono tracking-tight uppercase w-100 sm:w-min lg:w-max">
            Municipality scoreboard
          </h1>
        </div>
        <p className="hidden sm:block text-xs text-muted-foreground sm:pl-4">
          A ranking of municipalities based on their web performance scores,
          with historical comparisons.
        </p>
      </div>
      <Card className="border-border">
        <CardContent>
          <Suspense fallback={<LeaderboardSkeleton />}>
            <LeaderboardLoader />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
