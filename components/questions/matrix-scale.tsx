import { Table } from "lucide-react"
import { nanoid } from "nanoid"
import { cn } from "@/lib/utils"
import type { QuestionDef, MatrixScaleQuestion } from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PlusCircle, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { QuestionTitle } from "@/components/questions/question-title"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

function QuestionCard({
  question,
  order,
  showNumber = true,
  onTitleChange,
  onTitleBlur,
}: {
  question: MatrixScaleQuestion
  order: number
  showNumber?: boolean
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
}) {
  const { rows, scale } = question.config

  return (
    <div className="relative px-3 py-3">
      <QuestionTitle
        order={order}
        showNumber={showNumber}
        title={question.title}
        required={question.required}
        onChange={onTitleChange}
        onBlur={onTitleBlur}
      />

      <div className="mt-4 space-y-3">
        {rows.map((row, rowIdx) => (
          <div
            key={row.id}
            className={cn(
              "grid gap-0 rounded-lg border",
              rowIdx % 2 === 0 ? "bg-card" : "bg-card/50"
            )}
            style={{
              gridTemplateColumns: `150px repeat(${scale.length}, minmax(60px, 1fr))`,
            }}
          >
            {/* 行标题 */}
            <div className="flex items-center border-r border-border p-3 text-sm font-medium">
              {row.label}
            </div>
            {/* 选项 */}
            <RadioGroup className="contents">
              {scale.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-center border-r border-border p-3 last:border-r-0"
                >
                  <RadioGroupItem
                    value={`${row.id}-${s.id}`}
                    id={`${row.id}-${s.id}`}
                  />
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>

      {/* 量表两端标签 */}
      {scale.length > 0 && (
        <div className="mt-2 flex justify-between px-2 text-xs text-muted-foreground">
          <span>{scale[0]?.label}</span>
          <span>{scale[scale.length - 1]?.label}</span>
        </div>
      )}
    </div>
  )
}

export const matrixScaleDef: QuestionDef<MatrixScaleQuestion> = {
  type: "MATRIX_SCALE",
  category: "matrix",
  label: "矩阵量表",
  icon: Table,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "MATRIX_SCALE",
    title: "新问题",
    required: false,
    order,
    config: {
      rows: [
        { id: nanoid(), label: "产品质量" },
        { id: nanoid(), label: "服务态度" },
        { id: nanoid(), label: "物流速度" },
      ],
      scale: [
        { id: nanoid(), label: "1" },
        { id: nanoid(), label: "2" },
        { id: nanoid(), label: "3" },
        { id: nanoid(), label: "4" },
        { id: nanoid(), label: "5" },
      ],
    },
  }),
  Canvas: ({ question }) => {
    const { rows, scale } = question.config

    return (
      <div className="mt-4 space-y-3">
        {rows.map((row, rowIdx) => (
          <div
            key={row.id}
            className={cn(
              "grid gap-0 rounded-lg border",
              rowIdx % 2 === 0 ? "bg-card" : "bg-card/50"
            )}
            style={{
              gridTemplateColumns: `150px repeat(${scale.length}, minmax(60px, 1fr))`,
            }}
          >
            {/* 行标题 */}
            <div className="flex items-center border-r border-border p-3 text-sm font-medium">
              {row.label}
            </div>
            {/* 选项 */}
            <RadioGroup className="contents">
              {scale.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-center border-r border-border p-3 last:border-r-0"
                >
                  <RadioGroupItem
                    value={`${row.id}-${s.id}`}
                    id={`${row.id}-${s.id}`}
                  />
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
    )
  },
  Editor: ({ question, onChange, onSave }) => {
    const { rows, scale } = question.config

    const updateRow = (id: string, label: string) => {
      const newRows = rows.map((r) => (r.id === id ? { ...r, label } : r))
      onChange({ ...question, config: { ...question.config, rows: newRows } })
    }

    const addRow = () => {
      const newRow = { id: nanoid(), label: `选项${rows.length + 1}` }
      onSave?.({
        ...question,
        config: { ...question.config, rows: [...rows, newRow] },
      })
    }

    const removeRow = (id: string) => {
      if (rows.length <= 1) return
      const newRows = rows.filter((r) => r.id !== id)
      onChange({ ...question, config: { ...question.config, rows: newRows } })
    }

    const updateScale = (id: string, label: string) => {
      const newScale = scale.map((s) => (s.id === id ? { ...s, label } : s))
      onChange({ ...question, config: { ...question.config, scale: newScale } })
    }

    const addScale = () => {
      const newScale = { id: nanoid(), label: `${scale.length + 1}` }
      onSave?.({
        ...question,
        config: { ...question.config, scale: [...scale, newScale] },
      })
    }

    const removeScale = (id: string) => {
      if (scale.length <= 2) return
      const newScale = scale.filter((s) => s.id !== id)
      onChange({ ...question, config: { ...question.config, scale: newScale } })
    }

    return (
      <div className="space-y-6">
        {/* 行设置 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              行（评价项目）
            </Label>
            <Button variant="outline" size="sm" onClick={addRow}>
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              添加行
            </Button>
          </div>
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
              <Input
                value={row.label}
                onChange={(e) => updateRow(row.id, e.target.value)}
                onBlur={() =>
                  onSave?.({
                    ...question,
                    config: { ...question.config, rows: [...rows] },
                  })
                }
                className="h-8 border-none bg-transparent px-0 text-sm focus-visible:ring-0 dark:bg-transparent"
                placeholder="行内容"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeRow(row.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* 量表设置 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              量表（评分等级）
            </Label>
            <Button variant="outline" size="sm" onClick={addScale}>
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              添加等级
            </Button>
          </div>
          {scale.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary text-xs font-medium text-primary-foreground">
                {idx + 1}
              </div>
              <Input
                value={s.label}
                onChange={(e) => updateScale(s.id, e.target.value)}
                onBlur={() =>
                  onSave?.({
                    ...question,
                    config: { ...question.config, scale: [...scale] },
                  })
                }
                className="h-8 border-none bg-transparent px-0 text-sm focus-visible:ring-0 dark:bg-transparent"
                placeholder="等级标签"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeScale(s.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="rounded-md border bg-muted p-3 text-xs text-muted-foreground">
          <p>
            矩阵量表题允许用户对每个项目在统一的量表上进行评分，适用于满意度调查等场景。
          </p>
        </div>
      </div>
    )
  },
  QuestionCard,
}
