import { Skeleton } from "@/components/ui/skeleton";

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-2 pt-2">
      <Skeleton className="h-8 w-48 mb-4" />
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}