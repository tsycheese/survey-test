"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import * as echarts from "echarts"
import { Download, PieChart, BarChart3, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"

const COLORS = [
  "#2563eb", // blue-600
  "#7dd3fc", // sky-300
  "#4ade80", // green-400
  "#fbbf24", // amber-400
  "#a78bfa", // violet-400
  "#f87171", // red-400
  "#f472b6", // pink-400
  "#34d399", // emerald-400
  "#fb923c", // orange-400
  "#60a5fa", // blue-400
]

function getGridColor() {
  return document.documentElement.classList.contains("dark")
    ? "#374151"
    : "#e5e7eb"
}

function getAxisLabelColor() {
  return document.documentElement.classList.contains("dark")
    ? "#9ca3af"
    : "#6b7280"
}

function getTextColor() {
  return document.documentElement.classList.contains("dark")
    ? "#e5e7eb"
    : "#374151"
}

export type ChartType = "pie" | "bar" | "line"

export function QuestionChart({
  data,
  total,
  chartType,
}: {
  data: { name: string; count: number }[]
  total: number
  chartType: ChartType
}) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  const buildOption = useCallback(() => {
    const textColor = getTextColor()
    const axisLabelColor = getAxisLabelColor()
    const gridColor = getGridColor()

    const chartData = data.map((item, index) => ({
      name: item.name,
      value: item.count,
      itemStyle: {
        color: COLORS[index % COLORS.length],
      },
    }))

    if (chartType === "pie") {
      return {
        tooltip: {
          trigger: "item",
          formatter: "{b}: {c} ({d}%)",
          backgroundColor: "rgba(0,0,0,0.75)",
          borderColor: "transparent",
          textStyle: { color: "#fff" },
          padding: [8, 12],
        },
        legend: {
          bottom: 0,
          textStyle: { color: textColor, fontSize: 12 },
          itemWidth: 12,
          itemHeight: 12,
          itemGap: 16,
        },
        series: [
          {
            type: "pie",
            radius: ["40%", "70%"],
            center: ["50%", "45%"],
            avoidLabelOverlap: true,
            padAngle: 2,
            itemStyle: {
              borderRadius: 4,
              borderColor: document.documentElement.classList.contains("dark")
                ? "#1f2937"
                : "#fff",
              borderWidth: 2,
            },
            label: {
              show: true,
              formatter: "{b}: {d}%",
              color: textColor,
              fontSize: 12,
            },
            emphasis: {
              scale: true,
              scaleSize: 8,
              label: { show: true, fontSize: 13, fontWeight: "bold" },
            },
            data: chartData,
          },
        ],
      }
    }

    if (chartType === "bar") {
      return {
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: "rgba(0,0,0,0.75)",
          borderColor: "transparent",
          textStyle: { color: "#fff" },
          padding: [8, 12],
          formatter: (params: Array<{ name: string; value: number }>) => {
            const p = params[0]
            const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : "0.0"
            return `${p.name}<br/>数量: ${p.value} (${pct}%)`
          },
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "3%",
          top: "8%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: data.map((d) => d.name),
          axisLine: { lineStyle: { color: gridColor } },
          axisTick: { show: false },
          axisLabel: {
            fontSize: 11,
            color: axisLabelColor,
            interval: 0,
            rotate: data.length > 6 ? 30 : 0,
          },
        },
        yAxis: {
          type: "value",
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
          axisLabel: { fontSize: 11, color: axisLabelColor },
        },
        series: [
          {
            type: "bar",
            data: chartData,
            barWidth: "50%",
            itemStyle: { borderRadius: [4, 4, 0, 0] },
            emphasis: {
              itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.2)" },
            },
          },
        ],
      }
    }

    // line
    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(0,0,0,0.75)",
        borderColor: "transparent",
        textStyle: { color: "#fff" },
        padding: [8, 12],
        formatter: (params: Array<{ name: string; value: number }>) => {
          const p = params[0]
          const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : "0.0"
          return `${p.name}<br/>数量: ${p.value} (${pct}%)`
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "8%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: data.map((d) => d.name),
        axisLine: { lineStyle: { color: gridColor } },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 11,
          color: axisLabelColor,
          interval: 0,
          rotate: data.length > 6 ? 30 : 0,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
        axisLabel: { fontSize: 11, color: axisLabelColor },
      },
      series: [
        {
          type: "line",
          data: chartData,
          smooth: true,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { width: 3, color: COLORS[0] },
          itemStyle: { color: COLORS[0] },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(37,99,235,0.3)" },
                { offset: 1, color: "rgba(37,99,235,0.05)" },
              ],
            },
          },
          emphasis: {
            itemStyle: { borderWidth: 2, borderColor: "#fff" },
          },
        },
      ],
    }
  }, [data, total, chartType])

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return

    const instance = echarts.init(chartRef.current)
    chartInstanceRef.current = instance
    instance.setOption(buildOption())

    const handleResize = () => instance.resize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      instance.dispose()
      chartInstanceRef.current = null
    }
  }, [buildOption])

  // 数据/类型变化时更新
  useEffect(() => {
    const instance = chartInstanceRef.current
    if (!instance) return
    instance.setOption(buildOption(), true)
  }, [buildOption])

  // 监听主题切换
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const instance = chartInstanceRef.current
      if (!instance) return
      instance.setOption(buildOption(), true)
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [buildOption])

  return <div ref={chartRef} className="h-[280px] w-full" />
}

export function ChartTypeToggle({
  value,
  onChange,
  availableTypes,
}: {
  value: ChartType
  onChange: (type: ChartType) => void
  availableTypes?: ChartType[]
}) {
  const allTabs: { type: ChartType; label: string; icon: typeof PieChart }[] = [
    { type: "pie", label: "饼图", icon: PieChart },
    { type: "bar", label: "柱状图", icon: BarChart3 },
    { type: "line", label: "折线图", icon: TrendingUp },
  ]
  const tabs = availableTypes
    ? allTabs.filter((t) => availableTypes.includes(t.type))
    : allTabs

  return (
    <div className="inline-flex rounded-lg border bg-muted p-0.5">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = value === tab.type
        return (
          <button
            key={tab.type}
            onClick={() => onChange(tab.type)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export function ExportImageButton({
  chartRef,
  filename,
}: {
  chartRef: React.RefObject<HTMLDivElement | null>
  filename: string
}) {
  const handleExport = () => {
    const container = chartRef.current
    if (!container) return

    // 通过 echarts instance 获取图片
    const instance = echarts.getInstanceByDom(container)
    if (!instance) return

    const url = instance.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: document.documentElement.classList.contains("dark")
        ? "#1f2937"
        : "#ffffff",
    })

    const link = document.createElement("a")
    link.download = `${filename}.png`
    link.href = url
    link.click()
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="mr-1.5 h-3.5 w-3.5" />
      导出图片
    </Button>
  )
}

export function ChoiceChartView({
  data,
  total,
  title,
  defaultType = "pie",
  availableTypes,
}: {
  data: { name: string; count: number }[]
  total: number
  title: string
  defaultType?: ChartType
  availableTypes?: ChartType[]
}) {
  const [chartType, setChartType] = useState<ChartType>(defaultType)
  const chartWrapperRef = useRef<HTMLDivElement>(null)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        暂无数据
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 图表控制栏 */}
      <div className="flex items-center justify-between">
        <ChartTypeToggle
          value={chartType}
          onChange={setChartType}
          availableTypes={availableTypes}
        />
        <ExportImageButton chartRef={chartWrapperRef} filename={title} />
      </div>

      {/* echarts 图表 */}
      <div ref={chartWrapperRef}>
        <QuestionChart data={data} total={total} chartType={chartType} />
      </div>
    </div>
  )
}
