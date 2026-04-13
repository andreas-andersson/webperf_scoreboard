import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getScoreTextColor } from "@/lib/ratingColors";

interface TestResultsCardProps {
  testsData: Record<string, unknown>;
}

export function TestResultsCard({ testsData }: TestResultsCardProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="font-mono uppercase tracking-tight">
          Latest Test Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 font-mono text-sm">
          {Object.entries(testsData).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between items-center border-b border-border/40 pb-2"
            >
              <span className="text-muted-foreground">{key}</span>
              <span
                className={
                  typeof value === "number"
                    ? `font-bold ${getScoreTextColor(value)}`
                    : ""
                }
              >
                {typeof value === "number" ? value.toFixed(2) : String(value)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
