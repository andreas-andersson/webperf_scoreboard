"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ScoreHistoryChartProps {
  data: {
    date: string
    score: number
    [key: string]: string | number // allow dynamic category keys
  }[]
  categories?: string[] // list of category names to plot
}

const COLORS = [
    "#a6e3a1", // Green
    "#cba6f7", // Mauve
    "#f9e2af", // Yellow
    "#fab387", // Peach
    "#89b4fa", // Blue
    "#94e2d5", // Teal
];

export function ScoreHistoryChart({ data, categories = [] }: ScoreHistoryChartProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Score History</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
             <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              stroke="#a6adc8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#a6adc8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
              domain={[0, 5.5]} // Max 5, but slight buffer for visuals
            />
            <Tooltip />
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
  )
}
