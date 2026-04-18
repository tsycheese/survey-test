import { ListOrdered } from "lucide-react"
import { nanoid } from "nanoid"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { QuestionDef, RankingQuestion } from "@/lib/questions/types"
import { Button } from "@/components/ui/button"
import { PlusCircle, Trash2, GripVertical } from "lucide-react"
import { Label } from "@/components/ui/label"
import { QuestionTitle } from "@/components/questions/question-title"
import { QuestionTitleReadonly } from "@/components/questions/question-title-readonly"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

function QuestionCard({
  question,
  order,
  showNumber = true,
  onUpdate,
  onTitleChange,
  onTitleBlur,
  onDescriptionChange,
  onDescriptionBlur,
  onOptionChange,
  onFocusQuestion,
}: {
  question: RankingQuestion
  order: number
  showNumber?: boolean
  onUpdate?: (question: RankingQuestion) => void
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
  onOptionChange?: (question: RankingQuestion) => void
  onFocusQuestion?: () => void
}) {
  const { options } = question.config
  const [editingOptId, setEditingOptId] = useState<string | null>(null)
  const originalLabelRef = useRef<string>("")

  const handleOptUpdate = (
    optId: string,
    label: string,
    shouldSave = false
  ) => {
    const updatedOptions = options.map((o) =>
      o.id === optId ? { ...o, label } : o
    )
    const updatedQuestion = {
      ...question,
      config: {
        ...question.config,
        options: updatedOptions,
      },
    }
    if (shouldSave && onUpdate) {
      onUpdate(updatedQuestion)
    } else if (onOptionChange) {
      onOptionChange(updatedQuestion)
    }
  }

  return (
    <div className="relative px-3 py-3">
      <div className="absolute -top-2 left-6 z-10 rounded-t-none rounded-b bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
        排序题
      </div>

      <QuestionTitle
        order={order}
        showNumber={showNumber}
        title={question.title}
        description={question.description}
        required={question.required}
        onChange={onTitleChange}
        onBlur={onTitleBlur}
        onDescriptionChange={onDescriptionChange}
        onDescriptionBlur={onDescriptionBlur}
        onFocusQuestion={onFocusQuestion}
      />

      <div className="mt-3 space-y-2">
        {options.map((opt, idx) => (
          <div
            key={opt.id}
            className={cn(
              "relative flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-all duration-200",
              editingOptId === opt.id &&
                "border-primary shadow-sm ring-1 ring-primary"
            )}
            onClick={() => setEditingOptId(opt.id)}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {idx + 1}
            </div>
            {editingOptId === opt.id ? (
              <input
                autoFocus
                type="text"
                className="flex-1 bg-transparent text-sm font-medium outline-none"
                value={opt.label}
                onChange={(e) => handleOptUpdate(opt.id, e.target.value, false)}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  if (e.target.value !== originalLabelRef.current) {
                    handleOptUpdate(opt.id, e.target.value, true)
                  }
                  setEditingOptId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    if (e.currentTarget.value !== originalLabelRef.current) {
                      handleOptUpdate(opt.id, e.currentTarget.value, true)
                    }
                    setEditingOptId(null)
                  }
                }}
                onFocus={(e) => {
                  originalLabelRef.current = opt.label
                  // 将光标移动到文本末尾
                  const length = e.target.value.length
                  e.target.setSelectionRange(length, length)
                }}
              />
            ) : (
              <span className="truncate font-medium">{opt.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// 可拖拽的选项组件（用于编辑器）
function SortableOption({
  opt,
  idx,
  editingOptId,
  onUpdate,
  onDelete,
}: {
  opt: { id: string; label: string }
  idx: number
  editingOptId: string | null
  onUpdate: (optId: string, label: string) => void
  onDelete: (optId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opt.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-all duration-200",
        editingOptId === opt.id &&
          "border-primary shadow-sm ring-1 ring-primary"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        {idx + 1}
      </div>
      <input
        type="text"
        className="flex-1 bg-transparent text-sm font-medium outline-none focus:border-b focus:border-primary"
        value={opt.label}
        onChange={(e) => onUpdate(opt.id, e.target.value)}
        onBlur={() => {}}
        placeholder={`选项 ${idx + 1}`}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={() => onDelete(opt.id)}
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  )
}

// 只读版本的拖拽选项（用于试答/发布）
function SortableResponseOption({
  opt,
  idx,
}: {
  opt: { id: string; label: string }
  idx: number
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opt.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-all duration-200 hover:shadow-sm"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        {idx + 1}
      </div>
      <span className="flex-1 truncate font-medium">{opt.label}</span>
    </div>
  )
}

export const rankingDef: QuestionDef<RankingQuestion> = {
  type: "RANKING",
  category: "advanced",
  label: "排序题",
  icon: ListOrdered,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "RANKING",
    title: "新问题",
    required: false,
    order,
    config: {
      options: [
        { id: nanoid(), label: "选项 1" },
        { id: nanoid(), label: "选项 2" },
        { id: nanoid(), label: "选项 3" },
      ],
    },
  }),
  Canvas: ({ question, onUpdate }) => {
    const { options } = question.config
    const [sortedOptions, setSortedOptions] = useState(options)
    const [draggingId, setDraggingId] = useState<string | null>(null)

    const handleDragStart = (event: DragStartEvent) => {
      setDraggingId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event
      setDraggingId(null)

      if (!over || !onUpdate) return

      const oldIndex = sortedOptions.findIndex((o) => o.id === active.id)
      const newIndex = sortedOptions.findIndex((o) => o.id === over.id)

      if (oldIndex === newIndex || oldIndex < 0 || newIndex < 0) return

      const newOptions = arrayMove(sortedOptions, oldIndex, newIndex)
      setSortedOptions(newOptions)
      onUpdate({
        ...question,
        config: { ...question.config, options: newOptions },
      })
    }

    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm text-muted-foreground">请拖拽选项进行排序</p>
        <DndContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCenter}
        >
          <SortableContext
            items={sortedOptions.map((o) => o.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedOptions.map((opt, idx) => (
              <SortableOption
                key={opt.id}
                opt={opt}
                idx={idx}
                editingOptId={null}
                onUpdate={() => {}}
                onDelete={() => {}}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {draggingId && (
              <div className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-lg">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {sortedOptions.findIndex((o) => o.id === draggingId) + 1}
                </div>
                <span className="text-sm font-medium">
                  {sortedOptions.find((o) => o.id === draggingId)?.label || ""}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    )
  },
  Editor: ({ question, onChange, onSave }) => {
    const { options } = question.config
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [localOptions, setLocalOptions] = useState(options)

    const handleDragStart = (event: DragStartEvent) => {
      setDraggingId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event
      setDraggingId(null)

      if (!over) return

      const oldIndex = localOptions.findIndex((o) => o.id === active.id)
      const newIndex = localOptions.findIndex((o) => o.id === over.id)

      if (oldIndex === newIndex || oldIndex < 0 || newIndex < 0) return

      const newOptions = arrayMove(localOptions, oldIndex, newIndex)
      setLocalOptions(newOptions)
      onSave?.({
        ...question,
        config: { ...question.config, options: newOptions },
      })
    }

    const updateOption = (id: string, label: string) => {
      const newOptions = localOptions.map((o) =>
        o.id === id ? { ...o, label } : o
      )
      setLocalOptions(newOptions)
      onChange({
        ...question,
        config: { ...question.config, options: newOptions },
      })
    }

    const addOption = () => {
      const newOption = { id: nanoid(), label: `选项${options.length + 1}` }
      const newOptions = [...localOptions, newOption]
      setLocalOptions(newOptions)
      onSave?.({
        ...question,
        config: { ...question.config, options: newOptions },
      })
    }

    const removeOption = (id: string) => {
      if (localOptions.length <= 2) return
      const newOptions = localOptions.filter((o) => o.id !== id)
      setLocalOptions(newOptions)
      onChange({
        ...question,
        config: { ...question.config, options: newOptions },
      })
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">选项</Label>
          <DndContext
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            collisionDetection={closestCenter}
          >
            <SortableContext
              items={localOptions.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localOptions.map((opt, idx) => (
                  <SortableOption
                    key={opt.id}
                    opt={opt}
                    idx={idx}
                    editingOptId={null}
                    onUpdate={updateOption}
                    onDelete={removeOption}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {draggingId && (
                <div className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-lg">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {localOptions.findIndex((o) => o.id === draggingId) + 1}
                  </div>
                  <span className="text-sm font-medium">
                    {localOptions.find((o) => o.id === draggingId)?.label || ""}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
          <Button
            variant="outline"
            size="sm"
            onClick={addOption}
            className="w-full"
          >
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
            添加选项
          </Button>
        </div>
      </div>
    )
  },
  QuestionCard,
  Response: ({ question, order, showNumber = true, value, onChange }) => {
    const { options } = question.config
    const initialOrder = (value as string[]) || options.map((o) => o.id)
    const [sortedOptions, setSortedOptions] = useState(() => {
      // 根据 value 排序，如果没有 value 则保持原顺序
      const ordered = initialOrder
        .map((id) => options.find((o) => o.id === id))
        .filter(Boolean) as typeof options
      // 添加可能新增的选项
      const remaining = options.filter((o) => !initialOrder.includes(o.id))
      return [...ordered, ...remaining]
    })
    const [draggingId, setDraggingId] = useState<string | null>(null)

    const handleDragStart = (event: DragStartEvent) => {
      setDraggingId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event
      setDraggingId(null)

      if (!over) return

      const oldIndex = sortedOptions.findIndex((o) => o.id === active.id)
      const newIndex = sortedOptions.findIndex((o) => o.id === over.id)

      if (oldIndex === newIndex || oldIndex < 0 || newIndex < 0) return

      const newOptions = arrayMove(sortedOptions, oldIndex, newIndex)
      setSortedOptions(newOptions)
      onChange?.(newOptions.map((o) => o.id))
    }

    return (
      <div className="relative px-3 py-3">
        <QuestionTitleReadonly
          order={order}
          showNumber={showNumber}
          title={question.title}
          description={question.description}
          required={question.required}
        />
        <div className="mt-3 space-y-2">
          <p className="text-sm text-muted-foreground">请拖拽选项进行排序</p>
          <DndContext
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            collisionDetection={closestCenter}
          >
            <SortableContext
              items={sortedOptions.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedOptions.map((opt, idx) => (
                <SortableResponseOption key={opt.id} opt={opt} idx={idx} />
              ))}
            </SortableContext>
            <DragOverlay>
              {draggingId && (
                <div className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-lg">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {sortedOptions.findIndex((o) => o.id === draggingId) + 1}
                  </div>
                  <span className="text-sm font-medium">
                    {sortedOptions.find((o) => o.id === draggingId)?.label ||
                      ""}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    )
  },
}
