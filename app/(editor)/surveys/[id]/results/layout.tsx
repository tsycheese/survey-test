"use client"

import { usePathname } from "next/navigation"
import { ResultsSidebar } from "./components/results-sidebar"
import type { ResultsTab } from "./types"

function getTabFromPathname(pathname: string): ResultsTab {
  if (pathname.endsWith("/details")) return "details"
  if (pathname.endsWith("/charts")) return "charts"
  if (pathname.endsWith("/cross")) return "cross"
  if (pathname.endsWith("/summary")) return "summary"
  return "overview"
}

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const activeTab = getTabFromPathname(pathname || "")

  return (
    <div className="flex min-h-svh">
      <ResultsSidebar activeTab={activeTab} />
      <main className="ml-56 flex-1 bg-muted/30">{children}</main>
    </div>
  )
}
