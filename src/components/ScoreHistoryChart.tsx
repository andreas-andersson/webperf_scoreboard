"use client";

import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  usePlotArea,
} from "recharts";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getScoreTextColor } from "@/lib/ratingColors";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScoreHistoryChartProps {
  data: {
    date: string;
    score: number;
    [key: string]: string | number;
  }[];
  categories?: string[];
  testsKeys?: string[];
}

// Colors from ratingColors.ts — ≥4.0 green, ≥2.5 peach, <2.5 red
// Domain is fixed [0, 5], so thresholds map to exact Y% positions:
//   score 4.0 → 20% from top   (5-4)/5
//   score 2.5 → 50% from top   (5-2.5)/5
const STOPS = [
  { pct: "0%",   color: "#a6e3a1" },
  { pct: "20%",  color: "#a6e3a1" },
  { pct: "20%",  color: "#fab387" },
  { pct: "50%",  color: "#fab387" },
  { pct: "50%",  color: "#f38ba8" },
  { pct: "100%", color: "#f38ba8" },
];

// Direct child of LineChart — uses usePlotArea() to get exact plot area coords.
function ScoreGradientDef() {
  const plotArea = usePlotArea();
  if (!plotArea) return null;
  const y1 = plotArea.y;
  const y2 = plotArea.y + plotArea.height;
  return (
    <defs>
      <linearGradient
        id="scoreLineGradient"
        x1="0"
        y1={y1}
        x2="0"
        y2={y2}
        gradientUnits="userSpaceOnUse"
      >
        {STOPS.map(({ pct, color }, i) => (
          <stop key={i} offset={pct} stopColor={color} />
        ))}
      </linearGradient>
    </defs>
  );
}

export function ScoreHistoryChart({
  data,
  categories = [],
  testsKeys = [],
}: ScoreHistoryChartProps) {
  const [selected, setSelected] = useState("__total__");

  const dataKey = selected === "__total__" ? "score" : selected;
  const label = selected === "__total__" ? "Total Score" : selected;

  const values = data
    .map((d) => d[dataKey])
    .filter((v): v is number => typeof v === "number");
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Score History</CardTitle>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-[240px] font-mono text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__total__">Total Score</SelectItem>
            {categories.length > 0 && (
              <SelectGroup>
                <SelectLabel className="font-mono uppercase text-xs text-muted-foreground">
                  Categories
                </SelectLabel>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {testsKeys.length > 0 && (
              <SelectGroup>
                <SelectLabel className="font-mono uppercase text-xs text-muted-foreground">
                  Tests
                </SelectLabel>
                {testsKeys.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer>
          <LineChart data={data} width={1000} height={400}>
            <ScoreGradientDef />
            <CartesianGrid strokeDasharray="2 2" />
            <XAxis
              dataKey="date"
              stroke="#a6adc8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }}
            />
            <YAxis
              stroke="#a6adc8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#101010",
                borderColor: "#3d3d3d",
                color: "#cdd6f4",
                borderRadius: "8px",
              }}
              formatter={(value: number | undefined) => [
                value?.toFixed(2) ?? "",
                label,
              ]}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              name={label}
              stroke="url(#scoreLineGradient)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              legendType="none"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter className="flex gap-6 font-mono text-sm text-muted-foreground border-t border-border pt-4">
        <span className="uppercase tracking-wide">{label}</span>
        <span>
          Min:{" "}
          <span className={`font-bold ${min !== null ? getScoreTextColor(min) : ""}`}>
            {min !== null ? min.toFixed(2) : "—"}
          </span>
        </span>
        <span>
          Max:{" "}
          <span className={`font-bold ${max !== null ? getScoreTextColor(max) : ""}`}>
            {max !== null ? max.toFixed(2) : "—"}
          </span>
        </span>
      </CardFooter>
    </Card>
  );
}
