"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoreHistoryChartProps {
  data: {
    date: string;
    score: number;
    [key: string]: string | number; // allow dynamic category keys
  }[];
  categories?: string[]; // list of category names to plot
}

const COLORS = [
  "#a6e3a1", // Green
  "#cba6f7", // Mauve
  "#f9e2af", // Yellow
  "#fab387", // Peach
  "#89b4fa", // Blue
  "#94e2d5", // Teal
];

export function ScoreHistoryChart({
  data,
  categories = [],
}: ScoreHistoryChartProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Score History</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer>
          <LineChart data={data} width={1000} height={400}>
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
              tickFormatter={(value) => `${value}`}
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#101010",
                borderColor: "#3d3d3d",
                color: "#cdd6f4",
                borderRadius: "8px",
              }}
            />
            <Legend />

            {/* Main Total Score */}
            <Line
              type="monotone"
              dataKey="score"
              name="Total Score"
              stroke="#cdd6f4"
              strokeWidth={3}
              activeDot={{ r: 8 }}
            />

            {/* Dynamic Category Lines */}
            {categories.map((category, index) => (
              <Line
                key={category}
                type="monotone"
                dataKey={category}
                name={category}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={1}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
