"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react"
import type { ResultsData } from "../types"

const ResultsDataContext = createContext<{
  data: ResultsData | null
  loading: boolean
  error: string | null
  refetch: () => void
}>({
  data: null,
  loading: true,
  error: null,
  refetch: () => {},
})

export function ResultsDataProvider({
  children,
  surveyId,
  versionId,
}: {
  children: React.ReactNode
  surveyId: string
  versionId?: string | null
}) {
  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    let cancelled = false
    const url = versionId
      ? `/api/surveys/${surveyId}/responses?versionId=${versionId}`
      : `/api/surveys/${surveyId}/responses`

    setLoading(true)
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error("加载失败")
        return r.json()
      })
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
          setError(null)
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

  useEffect(() => {
    const cleanup = fetchData()
    return cleanup
  }, [fetchData])

  return (
    <ResultsDataContext.Provider
      value={{ data, loading, error, refetch: fetchData }}
    >
      {children}
    </ResultsDataContext.Provider>
  )
}

export function useResultsDataContext() {
  return useContext(ResultsDataContext)
}
