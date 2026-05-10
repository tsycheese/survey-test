"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import * as echarts from "echarts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { NamedCount } from "../types"

type MapType = "china"

// ========== 名称映射表 ==========

// 中国省份：ip-api.com 返回的名称 → 地图 GeoJSON 中的标准名称
const CHINA_NAME_MAP: Record<string, string> = {
  北京: "北京市",
  天津: "天津市",
  上海: "上海市",
  重庆: "重庆市",
  河北: "河北省",
  山西: "山西省",
  辽宁: "辽宁省",
  吉林: "吉林省",
  黑龙江: "黑龙江省",
  江苏: "江苏省",
  浙江: "浙江省",
  安徽: "安徽省",
  福建: "福建省",
  江西: "江西省",
  山东: "山东省",
  河南: "河南省",
  湖北: "湖北省",
  湖南: "湖南省",
  广东: "广东省",
  海南: "海南省",
  四川: "四川省",
  贵州: "贵州省",
  云南: "云南省",
  陕西: "陕西省",
  甘肃: "甘肃省",
  青海: "青海省",
  台湾: "台湾省",
  内蒙古: "内蒙古自治区",
  广西: "广西壮族自治区",
  西藏: "西藏自治区",
  宁夏: "宁夏回族自治区",
  新疆: "新疆维吾尔自治区",
  香港: "香港特别行政区",
  澳门: "澳门特别行政区",
}

// ========== 地图数据加载 ==========

const MAP_URLS: Record<MapType, string> = {
  china: "/geo/china.json",
}

const mapCache = new Map<MapType, unknown>()

async function loadMap(type: MapType): Promise<unknown> {
  if (mapCache.has(type)) {
    return mapCache.get(type)!
  }

  const response = await fetch(MAP_URLS[type])
  if (!response.ok) {
    throw new Error(`Failed to load ${type} map: ${response.status}`)
  }

  const geoJson = await response.json()
  mapCache.set(type, geoJson)
  return geoJson
}

// ========== 主题工具 ==========

function isDarkMode() {
  return document.documentElement.classList.contains("dark")
}

function getMapColors(dark: boolean) {
  return {
    borderColor: dark ? "#374151" : "#ffffff",
    emptyAreaColor: dark ? "#1f2937" : "#f3f4f6",
    emphasisAreaColor: dark ? "#4b5563" : "#e5e7eb",
    labelColor: dark ? "#d1d5db" : "#374151",
    emphasisLabelColor: dark ? "#ffffff" : "#111827",
    visualColors: dark
      ? ["#1e3a5f", "#1e40af", "#3b82f6", "#60a5fa", "#93c5fd"]
      : ["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#1e3a8a"],
  }
}

// ========== 组件 ==========

export function LocationStats({
  provinceData,
}: {
  provinceData: NamedCount[]
}) {
  const mapType: MapType = "china"
  const [mapLoaded, setMapLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  const currentData = provinceData

  // 标准化数据名称以匹配地图 GeoJSON
  const normalizedData = useMemo(() => {
    const result: Record<string, number> = {}

    currentData.forEach((item) => {
      let mappedName = item.name
      if (CHINA_NAME_MAP[item.name]) {
        mappedName = CHINA_NAME_MAP[item.name]
      }
      result[mappedName] = (result[mappedName] || 0) + item.count
    })

    return result
  }, [currentData])

  // 加载地图并初始化图表
  useEffect(() => {
    let cancelled = false
    let resizeHandler: (() => void) | null = null

    async function initMap() {
      try {
        setLoadError(null)
        setMapLoaded(false)

        // 先销毁旧实例
        if (chartInstanceRef.current) {
          chartInstanceRef.current.dispose()
          chartInstanceRef.current = null
        }

        const geoJson = await loadMap(mapType)
        if (cancelled) return

        if (!chartRef.current) return

        echarts.registerMap(
          mapType,
          geoJson as Parameters<typeof echarts.registerMap>[1]
        )

        const instance = echarts.init(chartRef.current)
        chartInstanceRef.current = instance

        resizeHandler = () => instance.resize()
        window.addEventListener("resize", resizeHandler)

        setMapLoaded(true)
      } catch (err) {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : "地图加载失败")
      }
    }

    initMap()

    return () => {
      cancelled = true
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler)
      }
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
        chartInstanceRef.current = null
      }
    }
  }, [mapType])

  // 构建图表配置
  const buildOption = useCallback(() => {
    const dark = isDarkMode()
    const colors = getMapColors(dark)

    const dataValues = Object.values(normalizedData)
    const maxValue = dataValues.length > 0 ? Math.max(...dataValues) : 1

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(0,0,0,0.8)",
        borderColor: "transparent",
        textStyle: { color: "#fff" },
        padding: [8, 12],
        formatter: (params: {
          name: string
          value: number | undefined
          data: { count?: number }
        }) => {
          const count = params.data?.count ?? params.value ?? 0
          const total = dataValues.reduce((a, b) => a + b, 0)
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0"
          return `<div style="font-weight:600;margin-bottom:4px">${params.name}</div>
                  <div>填写人数: <b>${count}</b></div>
                  <div>占比: <b>${pct}%</b></div>`
        },
      },
      visualMap: {
        min: 0,
        max: maxValue,
        left: "left",
        bottom: "bottom",
        text: ["多", "少"],
        calculable: true,
        inRange: {
          color: colors.visualColors,
        },
        textStyle: {
          color: colors.labelColor,
        },
      },
      series: [
        {
          name: "地域分布",
          type: "map",
          map: mapType,
          roam: true,
          scaleLimit: {
            min: 0.8,
            max: 5,
          },
          zoom: 1,
          label: {
            show: maxValue > 0,
            fontSize: 10,
            color: colors.labelColor,
          },
          labelLayout: {
            hideOverlap: true,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 11,
              fontWeight: "bold",
              color: colors.emphasisLabelColor,
            },
            itemStyle: {
              areaColor: colors.emphasisAreaColor,
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.3)",
            },
          },
          itemStyle: {
            borderColor: colors.borderColor,
            borderWidth: 1,
            areaColor: colors.emptyAreaColor,
          },
          select: {
            itemStyle: {
              areaColor: colors.emphasisAreaColor,
            },
            label: {
              color: colors.emphasisLabelColor,
            },
          },
          data: Object.entries(normalizedData).map(([name, count]) => ({
            name,
            value: count,
            count,
          })),
        },
      ],
    }
  }, [normalizedData, mapType])

  // 图表配置更新（地图加载后或数据变化时）
  useEffect(() => {
    const instance = chartInstanceRef.current
    if (!instance || !mapLoaded) return

    instance.setOption(buildOption(), true)
  }, [buildOption, mapLoaded])

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

  const hasData = currentData.length > 0

  // 计算占比前5的地区（不够5个全显示，第5个位置显示"其他"汇总剩余）
  const topRegions = useMemo(() => {
    if (!hasData) return []
    const total = currentData.reduce((sum, d) => sum + d.count, 0)
    const sorted = [...currentData].sort((a, b) => b.count - a.count)

    if (sorted.length <= 5) {
      // 不足5个，全部显示
      return sorted.map((d) => ({
        name: d.name,
        percent: total > 0 ? ((d.count / total) * 100).toFixed(0) : "0",
      }))
    }

    // 超过5个：前4个 + "其他"
    const top4 = sorted.slice(0, 4)
    const others = sorted.slice(4)
    const othersCount = others.reduce((sum, d) => sum + d.count, 0)

    return [
      ...top4.map((d) => ({
        name: d.name,
        percent: total > 0 ? ((d.count / total) * 100).toFixed(0) : "0",
      })),
      {
        name: "其他",
        percent: total > 0 ? ((othersCount / total) * 100).toFixed(0) : "0",
      },
    ]
  }, [currentData, hasData])

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">地域分布</CardTitle>
      </CardHeader>
      <CardContent>
        {loadError ? (
          <div className="flex h-[520px] items-center justify-center text-sm text-muted-foreground">
            地图加载失败：{loadError}
          </div>
        ) : (
          <div className="relative">
            <div ref={chartRef} className="h-[520px] w-full" />
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <span className="text-sm text-muted-foreground">
                  地图加载中...
                </span>
              </div>
            )}
            {mapLoaded && !hasData && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-lg bg-background/90 px-4 py-2 text-sm text-muted-foreground shadow">
                  暂无地域数据
                </span>
              </div>
            )}
          </div>
        )}

        {/* 占比前5的地区 */}
        {mapLoaded && hasData && topRegions.length > 0 && (
          <div className="mt-4 flex justify-center border-t pt-4">
            <div
              className="grid gap-6"
              style={{
                gridTemplateColumns: `repeat(${topRegions.length}, minmax(0, 1fr))`,
              }}
            >
              {topRegions.map((region) => (
                <div
                  key={region.name}
                  className="flex flex-col items-center justify-center"
                >
                  <span className="text-lg font-bold text-foreground">
                    {region.percent}%
                  </span>
                  <span className="max-w-full truncate text-xs text-muted-foreground">
                    {region.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
