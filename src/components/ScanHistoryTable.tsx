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
import { getScoreColor, getScoreTextColor } from "@/lib/ratingColors";

interface ScanRow {
  id: string;
  scannedAt: Date;
  totalScore: number | null;
  categories: unknown;
}

interface ScanHistoryTableProps {
  history: ScanRow[];
}

export function ScanHistoryTable({ history }: ScanHistoryTableProps) {
  return (
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
              <TableHead className="font-mono uppercase text-xs">Date</TableHead>
              <TableHead className="font-mono uppercase text-xs">Total Score</TableHead>
              <TableHead className="font-mono uppercase text-xs">Category Breakdown</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((scan) => (
              <TableRow key={scan.id} className="hover:bg-muted/30 border-border">
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
                        <span className={getScoreTextColor(v)}>{v.toFixed(2)}</span>
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
  );
}
