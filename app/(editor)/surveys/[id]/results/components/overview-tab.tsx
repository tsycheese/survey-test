"use client"

import { KpiCards } from "./kpi-cards"
import { TrendChart } from "./trend-chart"
import { DeviceStats } from "./device-stats"
import type { ResultsData } from "../types"

export function OverviewTab({ data }: { data: ResultsData }) {
  return (
    <div className="space-y-6">
      <KpiCards
        totalResponses={data.totalResponses}
        totalViews={data.totalViews}
        completionRate={data.completionRate}
        avgCompletionTime={data.avgCompletionTime}
      />
      <TrendChart data={data.dailyTrend} />
      <DeviceStats
        deviceStats={data.deviceStats}
        osStats={data.osStats}
        browserStats={data.browserStats}
        sourceStats={data.sourceStats}
      />
    </div>
  )
}
