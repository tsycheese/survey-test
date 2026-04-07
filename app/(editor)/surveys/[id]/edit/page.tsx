"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, GripVertical, Trash2 } from "lucide-react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useEditorStore } from "@/lib/editor-store"
import {
  getQuestionDef,
  createQuestion,
  QUESTION_DEFS,
} from "@/lib/questions/registry"
import type {
  Question,
  QuestionType,
  Survey,
  SurveySettings,
  QuestionCategory,
} from "@/lib/questions/types"
import { QUESTION_CATEGORIES } from "@/lib/questions/types"
import { SurveySettingsPanel } from "@/components/editor/survey-settings-panel"
import { AIChatDialog } from "@/components/ai/ai-chat-dialog"

export default function EditSurveyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const {
    survey,
    selectedId,
    setSurvey,
    selectQuestion,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    updateSurveyInfo,
    markSaved,
  } = useEditorStore()
  const [activeTab, setActiveTab] = useState<"survey" | "question">("survey")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // 选中题目时自动切换到题目面板
  const handleSelectQuestion = (id: string) => {
    selectQuestion(id)
    setActiveTab("question")
  }

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(event.active.id as string)
  }

  // 拖拽结束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggingId(null)

    if (!over || !survey) return

    const fromIndex = survey.questions.findIndex((q) => q.id === active.id)
    const toIndex = survey.questions.findIndex((q) => q.id === over.id)

    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return

    // 更新本地状态
    reorderQuestions(fromIndex, toIndex)

    // 调用 API 保存新顺序
    const newQuestions = arrayMove(survey.questions, fromIndex, toIndex).map(
      (q, idx) => ({ ...q, order: idx })
    )
    try {
      const res = await fetch(`/api/surveys/${id}/questions/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: newQuestions.map((q) => ({ id: q.id, order: q.order })),
        }),
      })
      if (!res.ok) {
        toast.error("更新题目顺序失败")
      }
    } catch {
      toast.error("更新题目顺序失败")
    }
  }

  useEffect(() => {
    fetch(`/api/surveys/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSurvey({
          id: data.id,
          title: data.title,
          description: data.description,
          published: data.published,
          settings: data.settings,
          questions: (data.questions ?? []).map(
            (q: Record<string, unknown>) => ({
              id: q.id,
              type: q.type,
              title: q.title,
              required: q.required,
              order: q.order,
              config: q.config ?? {},
            })
          ) as Question[],
        })
      })
  }, [id, setSurvey])

  async function handleSaveTitleDesc(title: string, description: string) {
    const res = await fetch(`/api/surveys/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
      }),
    })
    if (res.ok) {
      markSaved()
    }
  }

  async function handleUpdateSurveySettings(settings: SurveySettings) {
    if (!survey) return
    const newSettings = { ...survey.settings, ...settings }
    setSurvey({ ...survey, settings: newSettings })
    const res = await fetch(`/api/surveys/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: survey.title,
        description: survey.description,
        settings: newSettings,
      }),
    })
    if (res.ok) {
      markSaved()
    }
  }

  async function handleAddQuestion(type: QuestionType) {
    if (!survey) return
    const question = createQuestion(type, survey.questions.length)
    const res = await fetch(`/api/surveys/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: question.title,
        type: question.type,
        required: question.required,
        config: question.config,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      addQuestion({ ...question, id: created.id })
    } else {
      toast.error("添加失败")
    }
  }

  async function handleAddAIQuestions(questions: Question[]) {
    if (!survey) return

    try {
      // 批量添加题目
      for (const q of questions) {
        const res = await fetch(`/api/surveys/${id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: q.title,
            type: q.type,
            required: q.required,
            config: q.config,
          }),
        })
        if (res.ok) {
          const created = await res.json()
          addQuestion({ ...q, id: created.id })
        }
      }
      toast.success(`已添加 ${questions.length} 道题目`)
    } catch {
      toast.error("添加失败")
    }
  }

  async function handleDeleteQuestion(qid: string) {
    const res = await fetch(`/api/surveys/${id}/questions/${qid}`, {
      method: "DELETE",
    })
    if (res.ok) {
      deleteQuestion(qid)
    } else {
      toast.error("删除失败")
    }
  }

  async function handleUpdateQuestion(updated: Question) {
    updateQuestion(updated)
    await fetch(`/api/surveys/${id}/questions/${updated.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: updated.title,
        required: updated.required,
        config: updated.config,
      }),
    })
  }

  if (!survey) {
    return (
      <div className="flex h-svh items-center justify-center text-muted-foreground">
        加载中...
      </div>
    )
  }

  const selectedQuestion =
    survey.questions.find((q) => q.id === selectedId) ?? null

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      {/* 顶部栏 */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/surveys")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回
          </Button>
          <div className="h-4 w-px bg-border" />
          <input
            className="w-64 border-none bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground"
            value={survey.title}
            onChange={(e) =>
              updateSurveyInfo(e.target.value, survey.description ?? "")
            }
            onBlur={(e) => {
              const newTitle = e.target.value
              handleSaveTitleDesc(newTitle, survey.description ?? "")
            }}
            placeholder="未命名问卷"
          />
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-xs font-medium",
              survey.published ? "text-green-600" : "text-muted-foreground"
            )}
          >
            {survey.published ? "已发布" : "草稿"}
          </span>
        </div>
      </header>

      {/* 主体区域 */}
      <div className="relative flex-1 overflow-hidden">
        {/* 左栏：题型面板（悬浮） */}
        <aside className="absolute top-4 left-4 z-10 flex h-[calc(100%-2rem)] w-80 flex-col rounded-xl border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-xs font-medium text-muted-foreground">
              添加题目
            </span>
            <AIChatDialog onConfirm={handleAddAIQuestions} />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {(
              Object.entries(QUESTION_CATEGORIES) as Array<
                [
                  QuestionCategory,
                  (typeof QUESTION_CATEGORIES)[QuestionCategory],
                ]
              >
            ).map(([categoryKey, category]) => {
              const categoryDefs = QUESTION_DEFS.filter(
                (def) => def.category === categoryKey
              )
              if (categoryDefs.length === 0) return null

              return (
                <div
                  key={categoryKey}
                  className="mb-3 rounded-lg border bg-card last:mb-0"
                >
                  <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
                    <span className="text-base">{category.icon}</span>
                    <span className="text-xs font-medium">
                      {category.label}
                    </span>
                  </div>
                  <div className="space-y-0.5 p-2">
                    {categoryDefs.map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => handleAddQuestion(type as QuestionType)}
                        className="flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-muted"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {/* 中间：问卷画布 */}
        <div className="h-full overflow-y-auto px-[calc(20rem+2.5rem)] py-6">
          <div className="mx-auto max-w-[1000px]">
            {/* 问卷纸张 */}
            <div className="rounded-sm bg-background shadow-[0_4px_24px_rgba(0,0,0,0.10)] ring-1 ring-border">
              {/* 顶部色条 */}
              <div className="h-2 rounded-t-sm bg-primary" />

              {/* 标题区 */}
              <div className="border-b border-dashed border-border p-5">
                {isEditingTitle ? (
                  <Input
                    autoFocus
                    className="h-auto rounded-sm border-2 border-primary bg-transparent px-3 py-2 text-xl font-bold tracking-tight shadow-none focus-visible:ring-0"
                    style={{ fontSize: "1.25rem", lineHeight: "1.75rem" }}
                    value={survey.title}
                    onChange={(e) =>
                      updateSurveyInfo(e.target.value, survey.description ?? "")
                    }
                    onBlur={(e) => {
                      const newTitle = e.target.value
                      handleSaveTitleDesc(newTitle, survey.description ?? "")
                      setIsEditingTitle(false)
                    }}
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingTitle(true)}
                    className="group relative cursor-text rounded-sm border-2 border-transparent px-3 py-2 hover:border-dashed hover:border-border"
                  >
                    <div className="text-xl leading-7 font-bold tracking-tight">
                      {survey.title || "未命名问卷"}
                    </div>
                  </div>
                )}

                <div className="mt-2">
                  {isEditingDesc ? (
                    <Textarea
                      autoFocus
                      className="min-h-[80px] rounded-sm border-2 border-primary bg-transparent px-3 py-2 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
                      placeholder="添加问卷说明..."
                      value={survey.description ?? ""}
                      onChange={(e) =>
                        updateSurveyInfo(survey.title, e.target.value)
                      }
                      onBlur={(e) => {
                        const newDesc = e.target.value
                        handleSaveTitleDesc(survey.title, newDesc)
                        setIsEditingDesc(false)
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => setIsEditingDesc(true)}
                      className="group relative cursor-text rounded-sm border-2 border-transparent px-3 py-2 hover:border-dashed hover:border-border"
                    >
                      <div className="text-sm text-muted-foreground">
                        {survey.description || "添加问卷说明..."}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 题目列表 */}
              <DndContext
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                collisionDetection={pointerWithin}
              >
                <SortableContext
                  items={survey.questions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y divide-dashed divide-border">
                    {survey.questions.length === 0 ? (
                      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                        点击左侧题型添加第一道题
                      </div>
                    ) : (
                      survey.questions.map((q, idx) => (
                        <SortableQuestionCard
                          key={q.id}
                          question={q}
                          idx={idx}
                          selectedId={selectedId}
                          survey={survey}
                          onSelect={handleSelectQuestion}
                          onUpdate={handleUpdateQuestion}
                          onTitleChange={(title) =>
                            updateQuestion({ ...q, title })
                          }
                          onTitleBlur={(title) => {
                            handleUpdateQuestion({ ...q, title })
                          }}
                          onOptionChange={(updated) =>
                            updateQuestion(updated as Question)
                          }
                        />
                      ))
                    )}
                  </div>
                </SortableContext>

                {/* 拖拽预览 */}
                <DragOverlay>
                  {draggingId &&
                    (() => {
                      const draggingQuestion = survey?.questions.find(
                        (q) => q.id === draggingId
                      )
                      if (!draggingQuestion) return null
                      const def = getQuestionDef(draggingQuestion.type)
                      return (
                        <div className="flex flex-col gap-1.5 rounded-lg border bg-background px-12 py-2.5 shadow-lg">
                          <div className="flex items-center gap-2">
                            <def.icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              {def.label}
                            </span>
                          </div>
                          <div className="text-sm leading-relaxed font-medium">
                            {draggingQuestion.title || "未命名题目"}
                          </div>
                        </div>
                      )
                    })()}
                </DragOverlay>
              </DndContext>

              {/* 底部留白 */}
              <div className="h-8" />
            </div>
          </div>
        </div>

        {/* 右栏：属性编辑（悬浮） */}
        <aside className="absolute top-4 right-4 z-10 flex h-[calc(100%-2rem)] w-80 flex-col rounded-xl border bg-background shadow-xl">
          {/* 分段控制器 */}
          <div className="flex border-b px-3 pt-3 pb-3">
            <div className="flex w-full rounded-lg border bg-muted p-1">
              <button
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "survey"
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("survey")}
              >
                整卷
              </button>
              <button
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "question"
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground",
                  !selectedQuestion && "pointer-events-none opacity-50"
                )}
                onClick={() => selectedQuestion && setActiveTab("question")}
                disabled={!selectedQuestion}
              >
                题目
              </button>
            </div>
          </div>

          {/* 面板内容 */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "survey" ? (
              <SurveySettingsPanel
                settings={survey?.settings}
                onUpdateSettings={handleUpdateSurveySettings}
              />
            ) : selectedQuestion ? (
              <QuestionEditor
                key={selectedQuestion.id}
                question={selectedQuestion}
                onUpdate={updateQuestion}
                onSave={(updated) => handleUpdateQuestion(updated)}
                onDelete={() => handleDeleteQuestion(selectedQuestion.id)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                选中题目后可编辑属性
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function QuestionEditor({
  question,
  onUpdate,
  onSave,
  onDelete,
}: {
  question: Question
  onUpdate: (q: Question) => void
  onSave: (q: Question) => void
  onDelete: () => void
}) {
  const def = getQuestionDef(question.type)
  const hasChangesRef = useRef(false)

  function handleUpdate(updated: Question) {
    hasChangesRef.current = true
    onUpdate(updated)
  }

  function handleSave(updated?: Question) {
    if (updated) {
      onSave(updated)
    } else if (hasChangesRef.current) {
      onSave(question)
      hasChangesRef.current = false
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">题目属性</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* 题目类型 */}
        <div>
          <Label className="text-xs text-muted-foreground">题目类型</Label>
          <div className="mt-1 rounded-md border bg-muted px-3 py-2 text-sm">
            {def.label}
          </div>
        </div>

        {/* 题目内容 */}
        <div>
          <Label className="text-xs text-muted-foreground">题目内容</Label>
          <textarea
            className="mt-1 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            value={question.title}
            onChange={(e) =>
              handleUpdate({ ...question, title: e.target.value })
            }
            onBlur={() => handleSave({ ...question })}
          />
        </div>

        {/* 必填开关 */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">必填</Label>
          <button
            role="switch"
            aria-checked={question.required}
            onClick={() =>
              handleSave({ ...question, required: !question.required })
            }
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              question.required ? "bg-primary" : "bg-input"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg transition-transform",
                question.required ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* 题型专属编辑器 */}
        <def.Editor
          question={question as never}
          onChange={(updated) => handleUpdate(updated as Question)}
          onSave={handleSave}
        />
      </div>
    </div>
  )
}

// 可拖拽的题目卡片组件
function SortableQuestionCard({
  question,
  idx,
  selectedId,
  survey,
  onSelect,
  onUpdate,
  onTitleChange,
  onTitleBlur,
  onOptionChange,
}: {
  question: Question
  idx: number
  selectedId: string | null
  survey: Survey | null
  onSelect: (id: string) => void
  onUpdate: (q: Question) => void
  onTitleChange: (title: string) => void
  onTitleBlur: (title: string) => void
  onOptionChange: (q: Question) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const def = getQuestionDef(question.type)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex w-full items-start transition-colors",
        selectedId === question.id ? "bg-primary/5" : "hover:bg-muted/5"
      )}
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-3 left-2 z-20 flex h-6 w-6 cursor-grab items-center justify-center rounded opacity-0 transition-opacity hover:bg-muted",
          "group-hover:opacity-100"
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* 选中指示条 */}
      {selectedId === question.id && (
        <div className="absolute top-0 left-0 h-full w-1 rounded-l-sm bg-primary" />
      )}

      {/* 点击区域 */}
      <button
        type="button"
        onClick={() => onSelect(question.id)}
        className="flex-1 px-12 py-2 text-left"
      >
        <def.QuestionCard
          question={question as never}
          selected={selectedId === question.id}
          order={idx + 1}
          showNumber={survey?.settings?.showQuestionNumber ?? true}
          onUpdate={onUpdate}
          onTitleChange={onTitleChange}
          onTitleBlur={onTitleBlur}
          onOptionChange={onOptionChange}
        />
      </button>
    </div>
  )
}
