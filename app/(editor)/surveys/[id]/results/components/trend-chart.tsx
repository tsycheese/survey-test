"use client"

import { useEffect, useRef } from "react"
import * as echarts from "echarts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DailyTrend } from "../types"

export function TrendChart({ data }: { data: DailyTrend[] }) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const instance = echarts.init(chartRef.current)
    chartInstanceRef.current = instance

    const handleResize = () => instance.resize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      instance.dispose()
      chartInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const instance = chartInstanceRef.current
    if (!instance) return

    const dates = data.map((d) => {
      const date = new Date(d.date)
      return `${date.getMonth() + 1}/${date.getDate()}`
    })

    instance.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        backgroundColor: "rgba(0,0,0,0.75)",
        borderColor: "transparent",
        textStyle: { color: "#fff" },
        padding: [8, 12],
        formatter: (
          params: Array<{
            name: string
            seriesName: string
            value: number
            marker: string
          }>
        ) => {
          if (!params.length) return ""
          const fullDate = data.find((d) => {
            const date = new Date(d.date)
            const label = `${date.getMonth() + 1}/${date.getDate()}`
            return label === params[0].name
          })
          const dateStr = fullDate ? fullDate.date : params[0].name
          const rows = params.map(
            (p) => `${p.marker} ${p.seriesName}: ${p.value}`
          )
          return `<div style="font-weight:600;margin-bottom:4px">${dateStr}</div>${rows.join("<br/>")}`
        },
      },
      legend: {
        data: ["浏览量", "回收量"],
        bottom: 0,
        textStyle: {
          fontSize: 12,
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "10%",
        top: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: dates,
        axisLine: {
          lineStyle: { color: "hsl(var(--border))" },
        },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 12,
          color: "hsl(var(--muted-foreground))",
        },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: "rgba(150, 150, 150, 0.15)",
            type: "dashed",
          },
        },
        axisLabel: {
          fontSize: 12,
          color: "hsl(var(--muted-foreground))",
        },
      },
      series: [
        {
          name: "浏览量",
          type: "bar",
          data: data.map((d) => d.views),
          itemStyle: {
            color: "#3b82f6",
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: 16,
        },
        {
          name: "回收量",
          type: "bar",
          data: data.map((d) => d.responses),
          itemStyle: {
            color: "#22c55e",
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: 16,
        },
      ],
    })
  }, [data])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">回收趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={chartRef} className="h-[320px] w-full" />
      </CardContent>
    </Card>
  )
}
