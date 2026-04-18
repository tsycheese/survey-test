"use client"

import { useEffect, useState } from "react"
import type { ResultsData } from "../types"

export function useResultsData(surveyId: string, versionId?: string | null) {
  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const url = versionId
      ? `/api/surveys/${surveyId}/responses?versionId=${versionId}`
      : `/api/surveys/${surveyId}/responses`

    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error("加载失败")
        return r.json()
      })
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [surveyId, versionId])

  return { data, loading, error }
}
