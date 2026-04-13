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
import Link from "next/link";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useRef, useState } from "react";
import { Search } from "@/components/Search";
import { getScoreColor } from "@/lib/ratingColors";

function TrendIndicator({ trend }: { trend: number }) {
  if (trend > 0) {
    return (
      <div className="flex items-center text-[#a6e3a1] gap-1" aria-label={`Rank up ${trend}`}>
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
        <span>{trend}</span>
      </div>
    );
  }
  if (trend < 0) {
    return (
      <div className="flex items-center text-[#f38ba8] gap-1" aria-label={`Rank down ${Math.abs(trend)}`}>
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
        <span>{Math.abs(trend)}</span>
      </div>
    );
  }
  return <Minus className="h-4 w-4 text-[#a6adc8]" aria-label="No change" />;
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
  const [noResults, setNoResults] = useState(false);

  function handleSearchChange(hasResults: boolean) {
    setNoResults(!hasResults);
  }

  return (
    <>
      <Search tableBodyRef={tableBodyRef} onResultsChange={handleSearchChange} />

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-muted/50 border-border">
            <TableHead className="w-[80px]">RANK</TableHead>
            <TableHead className="w-[80px] hidden sm:table-cell">TREND</TableHead>
            <TableHead>SITE NAME</TableHead>
            <TableHead className="hidden md:table-cell">URL</TableHead>
            <TableHead className="text-right">SCORE</TableHead>
            <TableHead className="text-right hidden lg:table-cell">LAST SCANNED</TableHead>
            <TableHead className="text-right">ACTION</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody ref={tableBodyRef}>
          {(leaderboard.length === 0 || noResults) && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center h-24 text-muted-foreground"
              >
                {noResults ? "NO MATCHING SITES" : "NO DATA AVAILABLE"}
              </TableCell>
            </TableRow>
          )}
          {leaderboard.map((site) => (
            <TableRow
              key={site.id}
              className="font-mono hover:bg-muted/30 border-border"
            >
              <TableCell className="font-medium">#{site.rank}</TableCell>
              <TableCell className="hidden sm:table-cell">
                <TrendIndicator trend={site.rankChange} />
              </TableCell>
              <TableCell className="font-bold">{site.name}</TableCell>
              <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
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
              <TableCell className="text-right text-xs text-muted-foreground hidden lg:table-cell">
                {site.lastScanned !== "Never"
                  ? site.lastScanned.split("T")[0]
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
