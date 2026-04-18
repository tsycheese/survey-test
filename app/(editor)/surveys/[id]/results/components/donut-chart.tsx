"use client"

import { useEffect, useRef, useState } from "react"
import * as echarts from "echarts"
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

function EchartsDonut({
  data,
  onHover,
}: {
  data: NamedCount[]
  onHover: (index: number | null) => void
}) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  const total = data.reduce((sum, d) => sum + d.count, 0)

  // 初始化图表（只执行一次）
  useEffect(() => {
    if (!chartRef.current) return

    const instance = echarts.init(chartRef.current)
    chartInstanceRef.current = instance

    instance.on("mouseover", (params: { dataIndex: number }) => {
      onHover(params.dataIndex)
    })
    instance.on("mouseout", () => {
      onHover(null)
    })

    const handleResize = () => instance.resize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      instance.dispose()
      chartInstanceRef.current = null
    }
  }, [onHover])

  // 只在 data 变化时更新 option
  useEffect(() => {
    const instance = chartInstanceRef.current
    if (!instance) return

    const chartData =
      total > 0
        ? data.map((item, index) => ({
            name: item.name,
            value: item.count,
            itemStyle: {
              color: COLORS[index % COLORS.length],
            },
          }))
        : [{ name: "暂无数据", value: 1, itemStyle: { color: "#e5e7eb" } }]

    instance.setOption({
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)",
        backgroundColor: "rgba(0,0,0,0.75)",
        borderColor: "transparent",
        textStyle: { color: "#fff" },
        padding: [8, 12],
      },
      series: [
        {
          type: "pie",
          radius: ["58%", "82%"],
          avoidLabelOverlap: false,
          padAngle: 3,
          itemStyle: {
            borderRadius: 4,
            borderColor: "#fff",
            borderWidth: 3,
          },
          label: {
            show: false,
          },
          emphasis: {
            scale: true,
            scaleSize: 12,
            label: {
              show: false,
            },
          },
          data: chartData,
        },
      ],
    })
  }, [data, total])

  return <div ref={chartRef} className="h-full w-full" />
}

export function DonutChart({
  title,
  data,
}: {
  title: string
  data: NamedCount[]
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const total = data.reduce((sum, d) => sum + d.count, 0)

  const activeItem =
    activeIndex !== null && total > 0 ? data[activeIndex] : null
  const activeColor =
    activeIndex !== null ? COLORS[activeIndex % COLORS.length] : undefined

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 环形图 */}
        <div className="relative h-[200px] w-full">
          <EchartsDonut
            data={total > 0 ? data : [{ name: "暂无数据", count: 1 }]}
            onHover={setActiveIndex}
          />

          {/* 圆心显示当前项 */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {activeItem ? (
              <>
                <span
                  className="text-sm font-bold"
                  style={{ color: activeColor }}
                >
                  {activeItem.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {activeItem.count} (
                  {((activeItem.count / total) * 100).toFixed(0)}%)
                </span>
              </>
            ) : total > 0 ? (
              <span className="text-sm text-muted-foreground">总 {total}</span>
            ) : (
              <span className="text-sm text-muted-foreground">暂无数据</span>
            )}
          </div>
        </div>

        {/* 底部图例 */}
        <div className="flex items-start justify-center gap-8">
          {total > 0 ? (
            data.map((item, index) => {
              const pct =
                total > 0 ? ((item.count / total) * 100).toFixed(0) : "0"
              const isActive = activeIndex === index
              return (
                <div
                  key={item.name}
                  className="flex cursor-pointer flex-col items-center gap-1 transition-opacity"
                  style={{
                    opacity: activeIndex === null || isActive ? 1 : 0.4,
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
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
