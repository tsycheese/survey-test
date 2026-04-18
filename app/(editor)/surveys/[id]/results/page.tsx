"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useResultsData } from "./hooks/use-results-data"
import { ResultsSidebar } from "./components/results-sidebar"
import { ResultsHeader } from "./components/results-header"
import { OverviewTab } from "./components/overview-tab"
import { DetailsTab } from "./components/details-tab"
import { ChartsTab } from "./components/charts-tab"
import { CrossTab } from "./components/cross-tab"
import type { ResultsTab } from "./types"

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<ResultsTab>("overview")
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  )

  const { data, loading, error, refetch } = useResultsData(
    id,
    selectedVersionId
  )

  if (loading)
    return (
      <div className="flex min-h-svh items-center justify-center">
        加载中...
      </div>
    )

  if (error || !data)
    return (
      <div className="flex min-h-svh items-center justify-center">加载失败</div>
    )

  return (
    <div className="flex min-h-svh">
      <ResultsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="ml-56 flex-1 bg-muted/30">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <ResultsHeader
            title={data.survey.title}
            description={data.survey.description}
            versions={data.versions}
            currentVersionId={data.currentVersionId}
            selectedVersionId={selectedVersionId}
            onVersionChange={setSelectedVersionId}
          />

          {activeTab === "overview" && <OverviewTab data={data} />}
          {activeTab === "details" && (
            <DetailsTab data={data} onRefresh={refetch} />
          )}
          {activeTab === "charts" && (
            <ChartsTab questions={data.questions} total={data.totalResponses} />
          )}
          {activeTab === "cross" && <CrossTab data={data} />}
        </div>
      </main>
    </div>
  )
}
