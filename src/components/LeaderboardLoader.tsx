import { Leaderboard } from "@/components/Leaderboard";
import { getLeaderboard } from "@/lib/site.service";
import { cacheLife } from "next/cache";

export async function LeaderboardLoader() {
  "use cache";
  cacheLife("hours");

  const leaderboard = await getLeaderboard();
  return <Leaderboard leaderboard={leaderboard} />;
}
