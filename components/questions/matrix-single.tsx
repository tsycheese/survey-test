import { Table } from "lucide-react"
import { nanoid } from "nanoid"
import { cn } from "@/lib/utils"
import type { QuestionDef, MatrixSingleQuestion } from "@/lib/questions/types"
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
  question: MatrixSingleQuestion
  order: number
  showNumber?: boolean
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
}) {
  const { rows, columns } = question.config

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

      <div className="mt-4 overflow-hidden rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-[150px] border-r border-border p-3"></th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="border-r border-border p-3 text-center text-sm font-medium last:border-r-0"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b last:border-b-0",
                  rowIdx % 2 === 0 ? "bg-card" : "bg-card/50"
                )}
              >
                <td className="border-r border-border p-3 text-sm font-medium">
                  {row.label}
                </td>
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className="border-r border-border p-3 text-center last:border-r-0"
                  >
                    <RadioGroup value={`${row.id}-selected`}>
                      <RadioGroupItem
                        value={`${row.id}-${col.id}`}
                        id={`${row.id}-${col.id}`}
                        className="mx-auto"
                      />
                    </RadioGroup>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const matrixSingleDef: QuestionDef<MatrixSingleQuestion> = {
  type: "MATRIX_SINGLE",
  category: "matrix",
  label: "矩阵单选",
  icon: Table,
  defaultQuestion: (order) => ({
    id: nanoid(),
    type: "MATRIX_SINGLE",
    title: "新问题",
    required: false,
    order,
    config: {
      rows: [
        { id: nanoid(), label: "选项 1" },
        { id: nanoid(), label: "选项 2" },
      ],
      columns: [
        { id: nanoid(), label: "满意" },
        { id: nanoid(), label: "一般" },
        { id: nanoid(), label: "不满意" },
      ],
    },
  }),
  Canvas: ({ question }) => {
    const { rows, columns } = question.config

    return (
      <div className="mt-4 overflow-hidden rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-[150px] border-r border-border p-3"></th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="border-r border-border p-3 text-center text-sm font-medium last:border-r-0"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b last:border-b-0",
                  rowIdx % 2 === 0 ? "bg-card" : "bg-card/50"
                )}
              >
                <td className="border-r border-border p-3 text-sm font-medium">
                  {row.label}
                </td>
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className="border-r border-border p-3 text-center last:border-r-0"
                  >
                    <RadioGroupItem
                      value={`${row.id}-${col.id}`}
                      id={`${row.id}-${col.id}`}
                      className="mx-auto"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
  Editor: ({ question, onChange, onSave }) => {
    const { rows, columns } = question.config

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

    const updateColumn = (id: string, label: string) => {
      const newColumns = columns.map((c) => (c.id === id ? { ...c, label } : c))
      onChange({
        ...question,
        config: { ...question.config, columns: newColumns },
      })
    }

    const addColumn = () => {
      const newCol = { id: nanoid(), label: `列${columns.length + 1}` }
      onSave?.({
        ...question,
        config: { ...question.config, columns: [...columns, newCol] },
      })
    }

    const removeColumn = (id: string) => {
      if (columns.length <= 2) return
      const newColumns = columns.filter((c) => c.id !== id)
      onChange({
        ...question,
        config: { ...question.config, columns: newColumns },
      })
    }

    return (
      <div className="space-y-6">
        {/* 行设置 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">行（选项）</Label>
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

        {/* 列设置 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              列（评分维度）
            </Label>
            <Button variant="outline" size="sm" onClick={addColumn}>
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              添加列
            </Button>
          </div>
          {columns.map((col) => (
            <div key={col.id} className="flex items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
                列
              </div>
              <Input
                value={col.label}
                onChange={(e) => updateColumn(col.id, e.target.value)}
                onBlur={() =>
                  onSave?.({
                    ...question,
                    config: { ...question.config, columns: [...columns] },
                  })
                }
                className="h-8 border-none bg-transparent px-0 text-sm focus-visible:ring-0 dark:bg-transparent"
                placeholder="列内容"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeColumn(col.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="rounded-md border bg-muted p-3 text-xs text-muted-foreground">
          <p>
            矩阵单选题允许用户对每个选项在多个维度上进行评分，每行只能选择一个答案。
          </p>
        </div>
      </div>
    )
  },
  QuestionCard,
}
