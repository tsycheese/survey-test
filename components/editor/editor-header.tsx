"use client"

import { ArrowLeft, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEditorStore } from "@/lib/editor-store"

export function EditorHeader({ surveyId }: { surveyId: string }) {
  const router = useRouter()
  const { survey, dirty, updateSurveyInfo, markSaved } = useEditorStore()
  const [saving, setSaving] = useState(false)

  if (!survey) return null

  async function handleSave() {
    if (!survey) return
    setSaving(true)
    const res = await fetch(`/api/surveys/${surveyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: survey.title,
        description: survey.description,
      }),
    })
    if (res.ok) {
      markSaved()
      toast.success("已保存")
    } else {
      toast.error("保存失败")
    }
    setSaving(false)
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/surveys")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={survey.title}
          onChange={(e) => updateSurveyInfo(e.target.value, survey.description ?? "")}
          className="w-64 border-none bg-transparent text-base font-semibold shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0"
          placeholder="未命名问卷"
        />
        {dirty && (
          <span className="text-xs text-muted-foreground">未保存</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={saving || !dirty} size="sm">
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </header>
  )
}
