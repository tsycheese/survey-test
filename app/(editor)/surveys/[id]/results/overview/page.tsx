"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { useResultsData } from "../hooks/use-results-data"
import { ResultsHeader } from "../components/results-header"
import { OverviewTab } from "../components/overview-tab"

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>()
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  )

  // 首次加载时，默认选择最新版本
  const { data, loading, error } = useResultsData(id, selectedVersionId)

  useEffect(() => {
    if (data && data.versions.length > 0 && !selectedVersionId) {
      // 默认选择最新版本（版本号最大的）
      const latest = data.versions.reduce((max, v) =>
        v.version > max.version ? v : max
      )
      setSelectedVersionId(latest.id)
    }
  }, [data, selectedVersionId])

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
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <ResultsHeader
        title={data.survey.title}
        description={data.survey.description}
        versions={data.versions}
        currentVersionId={selectedVersionId}
        onVersionChange={setSelectedVersionId}
      />
      <OverviewTab data={data} />
    </div>
  )
}
