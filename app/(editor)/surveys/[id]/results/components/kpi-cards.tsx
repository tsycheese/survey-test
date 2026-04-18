"use client"

import { Users, Eye, Percent, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}分${secs}秒`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}时${remainingMins}分`
}

export function KpiCards({
  totalResponses,
  totalViews,
  completionRate,
  avgCompletionTime,
}: {
  totalResponses: number
  totalViews: number
  completionRate: number
  avgCompletionTime: number
}) {
  const cards = [
    {
      icon: Users,
      title: "回收量",
      value: totalResponses.toString(),
      description: "已提交的问卷数量",
    },
    {
      icon: Eye,
      title: "浏览量",
      value: totalViews.toString(),
      description: "问卷被打开的次数",
    },
    {
      icon: Percent,
      title: "回收率",
      value: `${completionRate}%`,
      description: "回收量 / 浏览量",
      trend:
        completionRate >= 50 ? "good" : completionRate >= 20 ? "normal" : "low",
    },
    {
      icon: Clock,
      title: "平均完成时间",
      value: formatDuration(avgCompletionTime),
      description: "用户平均答题时长",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </div>
                </div>
                {"trend" in card && card.trend && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      card.trend === "good"
                        ? "bg-green-100 text-green-700"
                        : card.trend === "normal"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {card.trend === "good"
                      ? "优秀"
                      : card.trend === "normal"
                        ? "一般"
                        : "偏低"}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
