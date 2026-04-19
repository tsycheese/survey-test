"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  GripVertical,
  Trash2,
  Play,
  Monitor,
  Tablet,
  Smartphone,
  History,
  Share2,
  Copy,
  ExternalLink,
} from "lucide-react"
import { useSurveyCollaboration } from "@/hooks/use-survey-collaboration"
import { OnlineMembers } from "@/components/collaboration/online-members"
import {
  LockIndicator,
  QuestionLockOverlay,
} from "@/components/collaboration/lock-indicator"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  pointerWithin,
  useDraggable,
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
import type { LockInfo } from "@/lib/pusher"
import { COLLABORATION_EVENTS } from "@/lib/pusher"
import type { QuestionData, SurveyData } from "@/lib/pusher"
import { QUESTION_CATEGORIES } from "@/lib/questions/types"
import { SurveySettingsPanel } from "@/components/editor/survey-settings-panel"
import { AIClarifyDialog } from "@/components/ai/ai-clarify-dialog"
import { CollaborationDialog } from "@/components/editor/collaboration-dialog"
import { VersionDialog } from "@/components/editor/version-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

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
  const titleOriginalRef = useRef(survey?.title ?? "")
  const descOriginalRef = useRef(survey?.description ?? "")
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [draggingType, setDraggingType] = useState<QuestionType | null>(null)
  const [insertIndex, setInsertIndex] = useState<number | null>(null)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [permission, setPermission] = useState<{
    canAccess: boolean
    canEdit: boolean
    isLoading: boolean
    userId: string | null
  }>({ canAccess: false, canEdit: false, isLoading: true, userId: null })

  // 乐观锁定状态：点击题目时立即设置，让UI立即显示"我正在编辑"
  const [optimisticLockedId, setOptimisticLockedId] = useState<string | null>(
    null
  )

  // 协作功能（Presence Channel 自动处理加入/离开）
  const {
    members,
    lockedQuestions,
    isConnected,
    lockQuestion,
    unlockQuestion,
    onEvent,
  } = useSurveyCollaboration(
    permission.canAccess ? id : null,
    permission.userId
  )

  // 监听远程内容变更
  useEffect(() => {
    if (!permission.canAccess || !survey) return

    // 监听题目更新
    const unsubscribeQuestionUpdated = onEvent(
      COLLABORATION_EVENTS.QUESTION_UPDATED,
      (data: unknown) => {
        const { question, fromUserId } = data as {
          question: QuestionData
          fromUserId: string
        }
        // 忽略自己触发的更新
        if (fromUserId === permission.userId) return

        updateQuestion({
          ...question,
          config: question.config,
        } as Question)

        toast.info("题目已被其他协作者更新", {
          duration: 2000,
        })
      }
    )

    // 监听题目创建
    const unsubscribeQuestionCreated = onEvent(
      COLLABORATION_EVENTS.QUESTION_CREATED,
      (data: unknown) => {
        const { question, fromUserId } = data as {
          question: QuestionData
          fromUserId: string
        }
        if (fromUserId === permission.userId) return

        addQuestion({
          ...question,
          config: question.config,
        } as Question)

        toast.info("有新题目添加", { duration: 2000 })
      }
    )

    // 监听题目删除
    const unsubscribeQuestionDeleted = onEvent(
      COLLABORATION_EVENTS.QUESTION_DELETED,
      (data: unknown) => {
        const { questionId, fromUserId } = data as {
          questionId: string
          fromUserId: string
        }
        if (fromUserId === permission.userId) return

        deleteQuestion(questionId)
        toast.info("有题目被删除", { duration: 2000 })
      }
    )

    // 监听题目重排
    const unsubscribeQuestionsReordered = onEvent(
      COLLABORATION_EVENTS.QUESTIONS_REORDERED,
      (data: unknown) => {
        const { questions: reorderedQuestions, fromUserId } = data as {
          questions: { id: string; order: number }[]
          fromUserId: string
        }
        if (fromUserId === permission.userId) return

        // 根据新顺序重新排序
        const orderMap = new Map(reorderedQuestions.map((q) => [q.id, q.order]))
        const newQuestions = [...survey.questions].sort(
          (a, b) =>
            (orderMap.get(a.id) ?? a.order) - (orderMap.get(b.id) ?? b.order)
        )
        newQuestions.forEach((q, idx) => {
          q.order = idx
        })
        setSurvey({ ...survey, questions: newQuestions })
      }
    )

    // 监听问卷更新
    const unsubscribeSurveyUpdated = onEvent(
      COLLABORATION_EVENTS.SURVEY_UPDATED,
      (data: unknown) => {
        const { survey: surveyData, fromUserId } = data as {
          survey: SurveyData
          fromUserId: string
        }
        if (fromUserId === permission.userId) return

        updateSurveyInfo(surveyData.title, surveyData.description ?? "")
        toast.info("问卷信息已更新", { duration: 2000 })
      }
    )

    return () => {
      unsubscribeQuestionUpdated()
      unsubscribeQuestionCreated()
      unsubscribeQuestionDeleted()
      unsubscribeQuestionsReordered()
      unsubscribeSurveyUpdated()
    }
  }, [
    permission.canAccess,
    permission.userId,
    survey,
    onEvent,
    updateQuestion,
    addQuestion,
    deleteQuestion,
    setSurvey,
    updateSurveyInfo,
  ])

  // 选中题目时自动切换到题目面板
  const handleSelectQuestion = (id: string) => {
    selectQuestion(id)
    setActiveTab("question")
  }

  // 拖拽开始（支持已有题目重排和新题目添加）
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    // 检查拖拽的是新题型还是已有题目
    if (String(active.id).startsWith("new-")) {
      setDraggingType(String(active.id).replace("new-", "") as QuestionType)
      setDraggingId(null)
    } else {
      setDraggingId(String(active.id))
      setDraggingType(null)
    }
  }

  // 拖拽经过题目列表，计算插入位置
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over || !survey) {
      setInsertIndex(null)
      return
    }

    // 如果是新题目拖拽
    if (draggingType) {
      // 拖拽到空画布
      if (over.id === "empty-canvas-dropzone") {
        setInsertIndex(0)
        return
      }

      const overIndex = survey.questions.findIndex((q) => q.id === over.id)
      if (overIndex >= 0) {
        setInsertIndex(overIndex)
      } else {
        setInsertIndex(null)
      }
      return
    }

    // 已有题目重排
    const overIndex = survey.questions.findIndex((q) => q.id === over.id)
    if (overIndex >= 0) {
      setInsertIndex(overIndex)
    } else {
      setInsertIndex(null)
    }
  }

  // 拖拽结束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggingId(null)
    setDraggingType(null)
    setInsertIndex(null)

    if (!over) return

    // 新题目拖拽：添加到指定位置
    if (draggingType && survey) {
      // 拖拽到空画布
      if (over.id === "empty-canvas-dropzone") {
        await handleAddQuestionAtPosition(draggingType, 0)
        return
      }

      const overIndex = survey.questions.findIndex((q) => q.id === over.id)
      if (overIndex >= 0) {
        await handleAddQuestionAtPosition(draggingType, overIndex)
      }
      return
    }

    // 已有题目重排
    if (!draggingId || !survey) return

    const fromIndex = survey.questions.findIndex((q) => q.id === draggingId)
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
    // 检查权限
    async function checkPermission() {
      try {
        const [surveyRes, sessionRes] = await Promise.all([
          fetch(`/api/surveys/${id}`),
          fetch("/api/auth/session"),
        ])

        if (!surveyRes.ok) {
          setPermission({
            canAccess: false,
            canEdit: false,
            isLoading: false,
            userId: null,
          })
          return
        }

        const surveyData = await surveyRes.json()
        const sessionData = await sessionRes.json()
        const userId = sessionData?.user?.id

        // 检查是否是创建者
        const isOwner = surveyData.userId === userId

        // 检查是否是协作者
        let isCollaborator = false
        let canEdit = false
        if (userId && !isOwner) {
          const collabRes = await fetch(`/api/surveys/${id}/collaborators`)
          if (collabRes.ok) {
            const data = await collabRes.json()
            const myCollab = data.collaborators?.find(
              (c: { userId: string }) => c.userId === userId
            )
            if (myCollab) {
              isCollaborator = true
              canEdit = myCollab.canEdit
            }
          }
        }

        // 创建者或协作者可以访问
        const canAccess = isOwner || isCollaborator
        const hasEditPermission = isOwner || canEdit

        setPermission({
          canAccess,
          canEdit: hasEditPermission,
          isLoading: false,
          userId,
        })

        if (canAccess) {
          setSurvey({
            id: surveyData.id,
            title: surveyData.title,
            description: surveyData.description,
            published: surveyData.published,
            userId: surveyData.userId,
            settings: surveyData.settings,
            questions: (surveyData.questions ?? []).map(
              (q: Record<string, unknown>) => ({
                id: q.id,
                type: q.type,
                title: q.title,
                description: q.description,
                required: q.required,
                order: q.order,
                config: q.config ?? {},
              })
            ) as Question[],
          })
        }
      } catch {
        setPermission({
          canAccess: false,
          canEdit: false,
          isLoading: false,
          userId: null,
        })
      }
    }

    checkPermission()
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

  async function handleAddQuestionAtPosition(
    type: QuestionType,
    index: number
  ) {
    if (!survey) return
    const question = createQuestion(type, index)
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
      const newQuestion = { ...question, id: created.id }
      // 在指定位置插入题目
      addQuestion(newQuestion)
      // 由于 addQuestion 是添加到末尾，需要手动调整顺序
      const newQuestions = [...survey.questions]
      newQuestions.splice(index, 0, newQuestion)
      // 更新所有题目的 order
      newQuestions.forEach((q, idx) => {
        q.order = idx
      })
      setSurvey({ ...survey, questions: newQuestions })
      // 选中新题目并切换到题目面板
      selectQuestion(newQuestion.id)
      setActiveTab("question")
      toast.success("题目已添加")
    } else {
      toast.error("添加失败")
    }
  }

  async function handleAddAIQuestions(
    questions: Question[],
    newTitle?: string,
    newDescription?: string
  ) {
    if (!survey) return

    try {
      // 如果有新的问卷标题/描述，先更新
      if (newTitle || newDescription) {
        const title = newTitle || survey.title
        const description = newDescription ?? survey.description ?? ""
        const res = await fetch(`/api/surveys/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: description || null,
          }),
        })
        if (res.ok) {
          updateSurveyInfo(title, description)
        }
      }

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
    // 检查题目是否被锁定
    const lockInfo = lockedQuestions.get(updated.id)
    if (lockInfo && lockInfo.userId !== permission.userId) {
      toast.error(`该题目正在被 ${lockInfo.userName || "其他用户"} 编辑`)
      return
    }

    updateQuestion(updated)
    const res = await fetch(`/api/surveys/${id}/questions/${updated.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: updated.title,
        description: updated.description,
        required: updated.required,
        config: updated.config,
      }),
    })
    if (res.ok) {
      toast.success("保存成功")
    } else {
      toast.error("保存失败")
    }
  }

  // 选中题目时尝试锁定
  const handleSelectQuestionWithLock = (questionId: string) => {
    // 先立即更新本地状态，让UI立即响应
    handleSelectQuestion(questionId)

    // 乐观更新：立即设置本地锁定状态，显示"我正在编辑"
    setOptimisticLockedId(questionId)

    // 异步执行锁定操作（不await，让它们在后台执行）
    const doLock = async () => {
      // 先解锁之前选中的题目
      if (selectedId && selectedId !== questionId) {
        const prevLock = lockedQuestions.get(selectedId)
        if (prevLock?.userId === permission.userId) {
          await unlockQuestion(selectedId)
        }
      }

      // 尝试锁定新选中的题目
      const lockInfo = lockedQuestions.get(questionId)
      if (!lockInfo || lockInfo.userId === permission.userId) {
        const success = await lockQuestion(questionId)
        if (!success && lockInfo) {
          toast.warning(`该题目正在被 ${lockInfo.userName || "其他用户"} 编辑`)
        }
      }
    }

    // 启动异步操作，不阻塞UI
    doLock()
  }

  if (permission.isLoading) {
    return (
      <div className="flex h-svh items-center justify-center text-muted-foreground">
        加载中...
      </div>
    )
  }

  if (!permission.canAccess) {
    return (
      <div className="flex h-svh flex-col items-center justify-center gap-4">
        <div className="text-lg font-medium">无权限访问</div>
        <div className="text-sm text-muted-foreground">
          您没有权限编辑此问卷，请联系问卷创建者获取访问权限
        </div>
        <Button onClick={() => router.push("/surveys")}>返回问卷列表</Button>
      </div>
    )
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
            onFocus={() => {
              titleOriginalRef.current = survey.title
            }}
            onBlur={(e) => {
              const newTitle = e.target.value
              if (newTitle !== titleOriginalRef.current) {
                handleSaveTitleDesc(newTitle, survey.description ?? "")
              }
            }}
            placeholder="未命名问卷"
          />
        </div>
        <div className="flex items-center gap-3">
          <OnlineMembers
            members={members}
            currentUserId={permission.userId}
            isConnected={isConnected}
          />
          <div className="h-4 w-px bg-border" />
          <CollaborationDialog surveyId={id} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVersionDialogOpen(true)}
          >
            <History className="mr-1.5 h-3.5 w-3.5" />
            版本
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewDialogOpen(true)}
            disabled={survey.questions.length === 0}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            试答
          </Button>
          {survey.published && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareDialogOpen(true)}
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              分享
            </Button>
          )}
          {!permission.canEdit && (
            <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              只读模式
            </span>
          )}
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
        {/* DndContext 包裹左侧栏和画布 */}
        <DndContext
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          collisionDetection={pointerWithin}
        >
          {/* 左栏：题型面板（悬浮） */}
          <aside className="absolute top-4 left-4 z-10 flex h-[calc(100%-2rem)] w-80 flex-col rounded-xl border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">
                添加题目
              </span>
              <AIClarifyDialog onConfirm={handleAddAIQuestions} />
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
                        <div key={type}>
                          <DraggableQuestionType
                            type={type as QuestionType}
                            label={label}
                            icon={Icon}
                            onClick={() =>
                              handleAddQuestion(type as QuestionType)
                            }
                          />
                        </div>
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
                        updateSurveyInfo(
                          e.target.value,
                          survey.description ?? ""
                        )
                      }
                      onFocus={() => {
                        titleOriginalRef.current = survey.title
                      }}
                      onBlur={(e) => {
                        const newTitle = e.target.value
                        if (newTitle !== titleOriginalRef.current) {
                          handleSaveTitleDesc(
                            newTitle,
                            survey.description ?? ""
                          )
                        }
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
                        onFocus={() => {
                          descOriginalRef.current = survey.description ?? ""
                        }}
                        onBlur={(e) => {
                          const newDesc = e.target.value
                          if (newDesc !== descOriginalRef.current) {
                            handleSaveTitleDesc(survey.title, newDesc)
                          }
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
                <SortableContext
                  items={survey.questions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y divide-dashed divide-border">
                    {survey.questions.length === 0 ? (
                      <div
                        id="empty-canvas-dropzone"
                        className={cn(
                          "flex h-40 items-center justify-center text-sm text-muted-foreground transition-colors",
                          draggingType && "bg-muted/50"
                        )}
                      >
                        {draggingType
                          ? "松开鼠标添加题目"
                          : "点击左侧题型添加第一道题"}
                      </div>
                    ) : (
                      survey.questions.map((q, idx) => {
                        // 乐观锁定：如果当前题目是乐观锁定的，使用乐观锁定状态
                        const isOptimisticLocked = optimisticLockedId === q.id
                        const serverLockInfo = lockedQuestions.get(q.id)
                        // 优先使用服务器锁定状态，如果没有则使用乐观锁定状态
                        const lockInfo: LockInfo | undefined =
                          serverLockInfo ??
                          (isOptimisticLocked
                            ? {
                                questionId: q.id,
                                userId: permission.userId!,
                                userName: "我",
                                lockedAt: new Date().toISOString(),
                              }
                            : undefined)
                        const isLockedByMe =
                          lockInfo?.userId === permission.userId
                        const isLockedByOther = lockInfo && !isLockedByMe

                        return (
                          <div key={q.id} className="relative">
                            {/* 插入位置指示线 */}
                            {insertIndex === idx && draggingType && (
                              <div className="absolute -top-px right-0 left-0 z-10 h-0.5 bg-primary shadow-[0_0_8px_2px_rgba(59,130,246,0.5)]" />
                            )}
                            <SortableQuestionCard
                              question={q}
                              idx={idx}
                              selectedId={selectedId}
                              survey={survey}
                              lockInfo={lockInfo}
                              isLockedByMe={!!isLockedByMe}
                              isLockedByOther={!!isLockedByOther}
                              onSelect={() =>
                                handleSelectQuestionWithLock(q.id)
                              }
                              onUpdate={handleUpdateQuestion}
                              onTitleChange={(title) =>
                                updateQuestion({ ...q, title })
                              }
                              onTitleBlur={(title) => {
                                handleUpdateQuestion({ ...q, title })
                              }}
                              onDescriptionChange={(description) =>
                                updateQuestion({ ...q, description })
                              }
                              onDescriptionBlur={(description) => {
                                handleUpdateQuestion({ ...q, description })
                              }}
                              onOptionChange={(updated) =>
                                updateQuestion(updated as Question)
                              }
                            />
                          </div>
                        )
                      })
                    )}
                    {/* 末尾插入指示线 */}
                    {insertIndex === survey.questions.length &&
                      draggingType && (
                        <div className="h-0.5 bg-primary shadow-[0_0_8px_2px_rgba(59,130,246,0.5)]" />
                      )}
                  </div>
                </SortableContext>

                {/* 拖拽预览 */}
                <DragOverlay dropAnimation={null}>
                  {draggingType &&
                    (() => {
                      const def = getQuestionDef(draggingType)
                      return (
                        <div className="flex items-center gap-2.5 rounded-md border bg-background px-3 py-2 shadow-lg">
                          <def.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {def.label}
                          </span>
                        </div>
                      )
                    })()}
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

                {/* 底部留白 */}
                <div className="h-8" />
              </div>
            </div>
          </div>
        </DndContext>

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

      {/* 试答设备选择弹窗 */}
      <PreviewDialog
        open={isPreviewDialogOpen}
        onOpenChange={setIsPreviewDialogOpen}
        surveyId={survey.id}
        shareToken={survey.id} // 使用 survey id 作为预览 token
      />

      {/* 分享弹窗 */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        surveyId={id}
      />

      {/* 版本管理弹窗 */}
      <VersionDialog
        surveyId={id}
        open={isVersionDialogOpen}
        onOpenChange={setIsVersionDialogOpen}
        onPublish={async () => {
          // 刷新问卷数据
          const res = await fetch(`/api/surveys/${id}`)
          if (res.ok) {
            const surveyData = await res.json()
            setSurvey({
              id: surveyData.id,
              title: surveyData.title,
              description: surveyData.description,
              published: surveyData.published,
              settings: surveyData.settings,
              questions: (surveyData.questions ?? []).map(
                (q: Record<string, unknown>) => ({
                  id: q.id,
                  type: q.type,
                  title: q.title,
                  description: q.description,
                  required: q.required,
                  order: q.order,
                  config: q.config ?? {},
                })
              ),
            })
          }
        }}
        published={survey.published}
        isOwner={permission.userId === survey.userId}
      />
    </div>
  )
}

// 试答设备选择弹窗
function PreviewDialog({
  open,
  onOpenChange,
  surveyId,
  shareToken,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  surveyId: string
  shareToken: string
}) {
  const devices = [
    {
      type: "desktop",
      label: "桌面",
      icon: Monitor,
      width: 1280,
      height: 800,
    },
    {
      type: "tablet",
      label: "平板",
      icon: Tablet,
      width: 768,
      height: 1024,
    },
    {
      type: "mobile",
      label: "手机",
      icon: Smartphone,
      width: 375,
      height: 812,
    },
  ]

  function openPreview(device: (typeof devices)[0]) {
    const url = `${window.location.origin}/s/${shareToken}?preview=1`
    const features = `width=${device.width},height=${device.height},resizable=yes,scrollbars=yes`
    window.open(url, "_blank", features)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>选择试答设备</DialogTitle>
          <DialogDescription>选择要模拟的设备类型开始试答</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 py-4">
          {devices.map((device) => (
            <button
              key={device.type}
              onClick={() => openPreview(device)}
              className="flex flex-col items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <device.icon className="h-8 w-8" />
              <span className="text-sm font-medium">{device.label}</span>
              <span className="text-xs text-muted-foreground">
                {device.width}×{device.height}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ShareDialog({
  open,
  onOpenChange,
  surveyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  surveyId: string
}) {
  const [survey, setSurvey] = useState<{
    shareToken: string
    published: boolean
  } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/surveys/${surveyId}`)
      .then((r) => r.json())
      .then((data) => {
        setSurvey({
          shareToken: data.shareToken,
          published: data.published,
        })
      })
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false))
  }, [open, surveyId])

  const shareUrl = survey?.shareToken
    ? `${window.location.origin}/s/${survey.shareToken}`
    : ""

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    toast.success("链接已复制")
  }

  function openLink() {
    window.open(shareUrl, "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            分享问卷
          </DialogTitle>
          <DialogDescription>复制下方链接分享给答题者</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : !survey?.published ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            问卷未发布，请先发布后再分享
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
              <span className="flex-1 truncate text-sm">{shareUrl}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyLink}
                title="复制链接"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={openLink}
                title="打开链接"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <Button className="w-full" onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" />
              复制分享链接
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
            onBlur={() => handleSave()}
          />
        </div>

        {/* 题目描述 */}
        <div>
          <Label className="text-xs text-muted-foreground">
            题目描述（可选）
          </Label>
          <textarea
            className="mt-1 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            rows={2}
            value={question.description || ""}
            onChange={(e) =>
              handleUpdate({ ...question, description: e.target.value })
            }
            onBlur={() => handleSave()}
            placeholder="添加题目描述，帮助用户理解题目..."
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
  lockInfo,
  isLockedByMe,
  isLockedByOther,
  onSelect,
  onUpdate,
  onTitleChange,
  onTitleBlur,
  onDescriptionChange,
  onDescriptionBlur,
  onOptionChange,
}: {
  question: Question
  idx: number
  selectedId: string | null
  survey: Survey | null
  lockInfo: LockInfo | undefined
  isLockedByMe: boolean
  isLockedByOther: boolean
  onSelect: () => void
  onUpdate: (q: Question) => void
  onTitleChange: (title: string) => void
  onTitleBlur: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
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
        selectedId === question.id ? "bg-primary/5" : "hover:bg-muted/5",
        isLockedByOther && "opacity-75",
        isLockedByOther && "rounded-sm ring-1 ring-amber-400/70 ring-inset"
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

      {/* 锁定指示器 */}
      {lockInfo && (
        <div className="absolute top-2 right-2 z-20">
          <LockIndicator lockInfo={lockInfo} isLockedByMe={isLockedByMe} />
        </div>
      )}

      {/* 点击区域 - 使用 mousedown 确保在表单聚焦前触发选中 */}
      <div
        onMouseDown={(e) => {
          // 如果点击的不是表单控件，或者当前题目未被选中，则触发选中
          const target = e.target as HTMLElement
          const isFormElement =
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable
          // 如果点击表单控件但题目未被选中，先选中题目
          if (isFormElement && selectedId !== question.id) {
            onSelect()
          }
        }}
        onClick={(e) => {
          // 避免重复触发（如果已经在 mousedown 中处理了）
          const target = e.target as HTMLElement
          const isFormElement =
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable
          if (!isFormElement) {
            onSelect()
          }
        }}
        className="relative flex-1 px-12 py-2 text-left"
      >
        {isLockedByOther ? (
          // 只读模式：使用 Response 组件（仅展示，不能编辑）
          <def.Response
            question={question as never}
            order={idx + 1}
            showNumber={survey?.settings?.showQuestionNumber ?? true}
            value={undefined}
            onChange={() => {}}
          />
        ) : (
          // 编辑模式
          <def.QuestionCard
            question={question as never}
            selected={selectedId === question.id}
            order={idx + 1}
            showNumber={survey?.settings?.showQuestionNumber ?? true}
            onUpdate={onUpdate}
            onTitleChange={onTitleChange}
            onTitleBlur={onTitleBlur}
            onDescriptionChange={onDescriptionChange}
            onDescriptionBlur={onDescriptionBlur}
            onOptionChange={onOptionChange}
            onFocusQuestion={onSelect}
          />
        )}

        {/* 被锁定时显示提示 */}
        <QuestionLockOverlay lockInfo={lockInfo} isLockedByMe={isLockedByMe} />
      </div>
    </div>
  )
}

// 左侧栏可拖拽的题型按钮组件
function DraggableQuestionType({
  type,
  label,
  icon: Icon,
  onClick,
}: {
  type: QuestionType
  label: string
  icon: React.ElementType
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `new-${type}`,
  })

  return (
    <div
      ref={setNodeRef}
      className="flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-muted"
    >
      {/* 拖拽手柄 - 只有按住这里才能拖拽 */}
      <div
        className="cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      {/* 点击区域 - 直接添加题目 */}
      <button
        className="flex flex-1 items-center gap-2.5"
        onClick={onClick}
        type="button"
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </button>
    </div>
  )
}
