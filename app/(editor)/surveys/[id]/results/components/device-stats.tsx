"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { NamedCount } from "../types"

const COLORS = [
  "#2563eb", // blue-600
  "#7dd3fc", // sky-300
  "#4ade80", // green-400
  "#fbbf24", // amber-400
  "#a78bfa", // violet-400
  "#f87171", // red-400
]

function DonutChart({ title, data }: { title: string; data: NamedCount[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  // 如果没有数据，显示占位
  const chartData =
    total > 0
      ? data
      : [
          { name: "暂无数据", count: 1 },
          { name: "", count: 0 },
        ]

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 环形图 */}
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={2}
                dataKey="count"
                nameKey="name"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={total > 0 ? COLORS[index % COLORS.length] : "#e5e7eb"}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 底部图例 */}
        <div className="flex items-start justify-center gap-8">
          {total > 0 ? (
            data.map((item, index) => {
              const pct =
                total > 0 ? ((item.count / total) * 100).toFixed(0) : "0"
              return (
                <div
                  key={item.name}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-lg font-bold">{pct}%</span>
                  <span className="text-sm text-muted-foreground">
                    {item.name}
                  </span>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-gray-300" />
              <span className="text-lg font-bold">-</span>
              <span className="text-sm text-muted-foreground">暂无数据</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function DeviceStats({
  deviceStats,
  osStats,
}: {
  deviceStats: NamedCount[]
  osStats: NamedCount[]
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DonutChart title="常用设备" data={deviceStats} />
      <DonutChart title="常用系统" data={osStats} />
    </div>
  )
}
