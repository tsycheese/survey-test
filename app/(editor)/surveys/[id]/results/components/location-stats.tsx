"use client"

import { useEffect, useRef } from "react"
import * as echarts from "echarts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { NamedCount } from "../types"

export function LocationStats({ data }: { data: NamedCount[] }) {
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

    const sorted = [...data].sort((a, b) => a.count - b.count)
    const names = sorted.map((d) => d.name)
    const values = sorted.map((d) => d.count)

    instance.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(0,0,0,0.75)",
        borderColor: "transparent",
        textStyle: { color: "#fff" },
        formatter: (
          params: Array<{ name: string; value: number; marker: string }>
        ) => {
          const p = params[0]
          return `${p.marker} ${p.name}: ${p.value}`
        },
      },
      grid: {
        left: "3%",
        right: "8%",
        bottom: "3%",
        top: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: document.documentElement.classList.contains("dark")
              ? "#374151"
              : "#e5e7eb",
            type: "dashed",
          },
        },
        axisLabel: {
          fontSize: 11,
          color: document.documentElement.classList.contains("dark")
            ? "#9ca3af"
            : "#6b7280",
        },
      },
      yAxis: {
        type: "category",
        data: names,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 12,
          color: document.documentElement.classList.contains("dark")
            ? "#9ca3af"
            : "#6b7280",
        },
      },
      series: [
        {
          type: "bar",
          data: values,
          itemStyle: {
            color: "#3b82f6",
            borderRadius: [0, 4, 4, 0],
          },
          barWidth: 16,
          label: {
            show: true,
            position: "right",
            fontSize: 11,
            color: document.documentElement.classList.contains("dark")
              ? "#9ca3af"
              : "#6b7280",
          },
        },
      ],
    })
  }, [data])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">地域分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            暂无地域数据
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">地域分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={chartRef} className="h-[320px] w-full" />
      </CardContent>
    </Card>
  )
}
