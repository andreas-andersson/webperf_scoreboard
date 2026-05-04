import { ArrowUpRight } from "lucide-react";
import { Leaderboard } from "@/components/Leaderboard";
import { Card, CardContent } from "@/components/ui/card";
import { getLeaderboard } from "@/lib/site.service";
import { cacheLife, cacheTag } from "next/cache";

async function getCachedLeaderboard() {
  "use cache";
  cacheLife("days");
  cacheTag("leaderboard");
  return getLeaderboard();
}

export default async function Home() {
  const leaderboard = await getCachedLeaderboard();

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
          <Leaderboard leaderboard={leaderboard} />
        </CardContent>
      </Card>
    </main>
  );
}
