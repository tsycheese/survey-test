"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  History,
  RotateCcw,
  Trash2,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Version = {
  id: string
  version: number
  title: string
  description: string | null
  publishedAt: string
  _count: { responses: number }
  isCurrent: boolean
}

interface VersionDialogProps {
  surveyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onPublish: () => Promise<void>
  published: boolean
}

export function VersionDialog({
  surveyId,
  open,
  onOpenChange,
  onPublish,
  published,
}: VersionDialogProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const loadVersions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/surveys/${surveyId}/versions`)
      if (res.ok) {
        const data = await res.json()
        setVersions(data.versions)
      }
    } catch {
      toast.error("加载版本失败")
    }
    setLoading(false)
  }, [surveyId])

  useEffect(() => {
    if (!open) return

    // 使用 requestAnimationFrame 避免在 effect 中直接调用 setState
    const timer = requestAnimationFrame(() => {
      loadVersions()
    })

    return () => cancelAnimationFrame(timer)
  }, [open, loadVersions])

  async function handlePublish() {
    setPublishing(true)
    try {
      const res = await fetch(`/api/surveys/${surveyId}/versions`, {
        method: "POST",
      })
      if (res.ok) {
        toast.success("发布成功")
        await loadVersions()
        await onPublish()
      } else {
        const data = await res.json()
        toast.error(data.error || "发布失败")
      }
    } catch {
      toast.error("发布失败")
    }
    setPublishing(false)
  }

  async function handleRollback(versionId: string) {
    try {
      const res = await fetch(
        `/api/surveys/${surveyId}/versions/${versionId}/rollback`,
        {
          method: "POST",
        }
      )
      if (res.ok) {
        toast.success("回滚成功")
        await loadVersions()
      } else {
        toast.error("回滚失败")
      }
    } catch {
      toast.error("回滚失败")
    }
  }

  async function handleDelete(versionId: string) {
    try {
      const res = await fetch(
        `/api/surveys/${surveyId}/versions/${versionId}`,
        {
          method: "DELETE",
        }
      )
      if (res.ok) {
        toast.success("删除成功")
        await loadVersions()
      } else {
        const data = await res.json()
        toast.error(data.error || "删除失败")
      }
    } catch {
      toast.error("删除失败")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            版本管理
          </DialogTitle>
          <DialogDescription>
            管理问卷的发布版本，每个版本包含完整的问卷内容快照
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 发布按钮 */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
            <div>
              <p className="font-medium">
                {published ? "发布新版本" : "首次发布"}
              </p>
              <p className="text-sm text-muted-foreground">
                {published
                  ? "将当前编辑的内容发布为新版本"
                  : "发布问卷，生成分享链接"}
              </p>
            </div>
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing ? "发布中..." : published ? "发布新版本" : "发布问卷"}
            </Button>
          </div>

          {/* 版本列表 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">历史版本</h4>
            {loading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                加载中...
              </p>
            ) : versions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                暂无版本，点击上方按钮发布
              </p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3",
                      v.isCurrent && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">v{v.version}</span>
                        {v.isCurrent && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                            当前
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(v.publishedAt).toLocaleString()}
                        </span>
                        <span>{v._count.responses} 份回答</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!v.isCurrent && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRollback(v.id)}
                            title="回滚到此版本"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(v.id)}
                            title="删除版本"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {v.isCurrent && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
