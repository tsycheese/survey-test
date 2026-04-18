"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { NamedCount } from "../types"

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 65%, 60%)",
  "hsl(199, 89%, 48%)",
]

function DonutChart({ title, data }: { title: string; data: NamedCount[] }) {
  const chartData = data.length > 0 ? data : [{ name: "暂无数据", count: 1 }]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="count"
                nameKey="name"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--background))",
                }}
                formatter={(value, name) => [String(value), String(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function DeviceStats({
  deviceStats,
  osStats,
  browserStats,
  sourceStats,
}: {
  deviceStats: NamedCount[]
  osStats: NamedCount[]
  browserStats: NamedCount[]
  sourceStats: NamedCount[]
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DonutChart title="常用设备" data={deviceStats} />
      <DonutChart title="常用系统" data={osStats} />
      <DonutChart title="常用浏览器" data={browserStats} />
      <DonutChart title="渠道来源" data={sourceStats} />
    </div>
  )
}
