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
  selectedVersionId,
  onVersionChange,
}: {
  title: string
  description: string | null
  versions: Version[]
  currentVersionId: string | null
  selectedVersionId: string | null
  onVersionChange: (versionId: string) => void
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
          <Select
            value={selectedVersionId || ""}
            onValueChange={onVersionChange}
          >
            <SelectTrigger className="w-44">
              <History className="mr-2 h-4 w-4" />
              <SelectValue placeholder="选择版本" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  v{v.version}
                  {v.id === currentVersionId && " (当前)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
