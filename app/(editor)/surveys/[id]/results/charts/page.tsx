"use client"

import { useParams } from "next/navigation"
import { useResultsData } from "../hooks/use-results-data"
import { ResultsHeader } from "../components/results-header"
import { ChartsTab } from "../components/charts-tab"

export default function ChartsPage() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, error } = useResultsData(id)

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
        currentVersionId={data.currentVersionId}
      />
      <ChartsTab questions={data.questions} total={data.totalResponses} />
    </div>
  )
}
