import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getScoreColor } from "@/lib/ratingColors";

interface ScoreCardProps {
  label: string;
  score: number | null;
}

export function ScoreCard({ label, score }: ScoreCardProps) {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-mono uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">
          <Badge
            className={`text-lg px-3 py-1 ${getScoreColor(score)} rounded-none border-0`}
          >
            {score?.toFixed(2)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
