"use client"

import { useState, useMemo } from "react"
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

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  }
}

function describeArc(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(cx, cy, outerR, endAngle)
  const endOuter = polarToCartesian(cx, cy, outerR, startAngle)
  const startInner = polarToCartesian(cx, cy, innerR, endAngle)
  const endInner = polarToCartesian(cx, cy, innerR, startAngle)

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

  return [
    "M",
    startOuter.x,
    startOuter.y,
    "A",
    outerR,
    outerR,
    0,
    largeArcFlag,
    0,
    endOuter.x,
    endOuter.y,
    "L",
    endInner.x,
    endInner.y,
    "A",
    innerR,
    innerR,
    0,
    largeArcFlag,
    1,
    startInner.x,
    startInner.y,
    "Z",
  ].join(" ")
}

function DonutChartSVG({
  data,
  activeIndex,
  onHover,
}: {
  data: NamedCount[]
  activeIndex: number | null
  onHover: (index: number | null) => void
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const cx = 150
  const cy = 100
  const innerR = 58
  const baseOuterR = 82
  const hoverOuterR = 94
  const paddingAngle = 2

  const arcs = useMemo(() => {
    if (total === 0) return []
    let currentAngle = 0
    return data.map((item) => {
      const angle = (item.count / total) * 360
      const startAngle = currentAngle + paddingAngle / 2
      const endAngle = currentAngle + angle - paddingAngle / 2
      currentAngle += angle
      return { startAngle, endAngle, item }
    })
  }, [data, total])

  if (total === 0) {
    // 空状态：显示灰色圆环
    return (
      <svg viewBox="0 0 300 200" className="h-full w-full">
        <path
          d={describeArc(cx, cy, innerR, baseOuterR, 0, 360)}
          fill="#e5e7eb"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 300 200" className="h-full w-full">
      {arcs.map((arc, index) => {
        const isActive = activeIndex === index
        const isDimmed = activeIndex !== null && !isActive
        const outerR = isActive ? hoverOuterR : baseOuterR

        return (
          <path
            key={index}
            d={describeArc(
              cx,
              cy,
              innerR,
              outerR,
              arc.startAngle,
              arc.endAngle
            )}
            fill={COLORS[index % COLORS.length]}
            opacity={isDimmed ? 0.5 : 1}
            style={{
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onMouseEnter={() => onHover(index)}
            onMouseLeave={() => onHover(null)}
          />
        )
      })}
    </svg>
  )
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
          <DonutChartSVG
            data={total > 0 ? data : [{ name: "暂无数据", count: 1 }]}
            activeIndex={activeIndex}
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
