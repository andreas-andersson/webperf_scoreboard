"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useRef } from "react";
import { Search } from "@/components/Search";

function getScoreColor(score: number | null) {
  if (score === null) return "bg-[#6c7086] hover:bg-[#585b70]"; // Overlay0
  if (score >= 4.0) return "bg-[#a6e3a1] hover:bg-[#94e2d5] text-[#1e1e2e]"; // Green -> Teal hover
  if (score >= 2.5) return "bg-[#fab387] hover:bg-[#f9e2af] text-[#1e1e2e]"; // Peach -> Yellow hover
  return "bg-[#f38ba8] hover:bg-[#eba0ac] text-[#1e1e2e]"; // Red -> Maroonish hover
}

function TrendIndicator({ trend }: { trend: number }) {
  if (trend > 0) {
    return (
      <div className="flex items-center text-[#a6e3a1] gap-1">
        <ArrowUp className="h-4 w-4" />
        <span>{trend}</span>
      </div>
    );
  }
  if (trend < 0) {
    return (
      <div className="flex items-center text-[#f38ba8] gap-1">
        <ArrowDown className="h-4 w-4" />
        <span>{Math.abs(trend)}</span>
      </div>
    );
  }
  return <Minus className="h-4 w-4 text-[#a6adc8]" />;
}

interface LeaderboardProps {
  leaderboard: {
    id: number;
    name: string;
    url: string;
    totalScore: number | null;
    lastScanned: string;
    rank: number;
    rankChange: number;
  }[];
}

export function Leaderboard({ leaderboard }: LeaderboardProps) {
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  return (
    <>
      <Search tableBodyRef={tableBodyRef} />

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-muted/50 border-border">
            <TableHead className="w-[80px]">RANK</TableHead>
            <TableHead className="w-[80px]">TREND</TableHead>
            <TableHead>SITE NAME</TableHead>
            <TableHead>URL</TableHead>
            <TableHead className="text-right">SCORE</TableHead>
            <TableHead className="text-right">LAST SCANNED</TableHead>
            <TableHead className="text-right">ACTION</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody ref={tableBodyRef}>
          {leaderboard.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center h-24 text-muted-foreground"
              >
                NO DATA AVAILABLE
              </TableCell>
            </TableRow>
          )}
          {leaderboard.map((site) => (
            <TableRow
              key={site.id}
              className="font-mono hover:bg-muted/30 border-border"
            >
              <TableCell className="font-medium">#{site.rank}</TableCell>
              <TableCell>
                <TrendIndicator trend={site.rankChange} />
              </TableCell>
              <TableCell className="font-bold">{site.name}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                <a
                  href={
                    site.url.startsWith("http")
                      ? site.url
                      : `https://${site.url}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:text-primary transition-colors"
                >
                  {site.url}
                </a>
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  variant="outline"
                  className={`font-mono border-0 rounded-none ${getScoreColor(site.totalScore)}`}
                >
                  {site.totalScore?.toFixed(2) ?? "N/A"}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {site.lastScanned !== "Never"
                  ? new Date(site.lastScanned).toISOString().split("T")[0]
                  : "NEVER"}
              </TableCell>
              <TableCell className="text-right text-xs">
                <Link
                  href={`/site/${site.id}`}
                  className="text-primary hover:underline uppercase"
                >
                  [DETAILS]
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
