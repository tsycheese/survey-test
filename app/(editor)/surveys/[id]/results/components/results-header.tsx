"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Version } from "../types"

export function ResultsHeader({
  title,
  description,
  versions,
  currentVersionId,
}: {
  title: string
  description: string | null
  versions: Version[]
  currentVersionId: string | null
}) {
  const router = useRouter()

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/surveys")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {versions.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <History className="h-4 w-4" />
            <span>共 {versions.length} 个版本</span>
          </div>
        )}
      </div>
    </div>
  )
}
