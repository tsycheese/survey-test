"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react"

const VersionContext = createContext<{
  selectedVersionId: string | null
  setSelectedVersionId: (id: string | null) => void
}>({
  selectedVersionId: null,
  setSelectedVersionId: () => {},
})

export function VersionProvider({
  children,
  defaultVersionId,
}: {
  children: React.ReactNode
  defaultVersionId?: string | null
}) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    defaultVersionId ?? null
  )

  return (
    <VersionContext.Provider
      value={{ selectedVersionId, setSelectedVersionId }}
    >
      {children}
    </VersionContext.Provider>
  )
}

export function useSelectedVersion() {
  return useContext(VersionContext)
}
