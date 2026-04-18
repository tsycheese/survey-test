"use client"

import { useParams, useRouter } from "next/navigation"
import { LayoutDashboard, Table2, BarChart3, GitCompare } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ResultsTab } from "../types"

const TABS: { id: ResultsTab; label: string; icon: typeof LayoutDashboard }[] =
  [
    { id: "overview", label: "数据概览", icon: LayoutDashboard },
    { id: "details", label: "数据详情", icon: Table2 },
    { id: "charts", label: "统计图表", icon: BarChart3 },
    { id: "cross", label: "交叉分析", icon: GitCompare },
  ]

export function ResultsSidebar({ activeTab }: { activeTab: ResultsTab }) {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  return (
    <aside className="fixed top-0 left-0 h-svh w-56 border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold">数据统计</span>
      </div>
      <nav className="p-2">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => router.push(`/surveys/${id}/results/${tab.id}`)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
