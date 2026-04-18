"use client"

import { useState, useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ResultsData, QuestionStat } from "../types"

function getQuestionValues(
  question: QuestionStat,
  responses: ResultsData["responses"]
): Map<string, string[]> {
  const result = new Map<string, string[]>()
  responses.forEach((r) => {
    const ans = r.answers.find((a) => a.questionId === question.id)
    if (!ans || ans.value === null || ans.value === undefined) {
      result.set(r.id, ["未回答"])
      return
    }
    if (Array.isArray(ans.value)) {
      result.set(r.id, ans.value.map(String))
    } else {
      result.set(r.id, [String(ans.value)])
    }
  })
  return result
}

function getOptionLabels(q: QuestionStat): string[] {
  if (q.config?.options) {
    return q.config.options.map((o) => o.label)
  }
  if (q.config?.rows) {
    return q.config.rows.map((r) => r.label)
  }
  if (q.config?.columns) {
    return q.config.columns.map((c) => c.label)
  }
  if (q.type === "GENDER") {
    return ["男", "女", "其他"]
  }
  return []
}

export function CrossTab({ data }: { data: ResultsData }) {
  const [rowQId, setRowQId] = useState<string>("")
  const [colQId, setColQId] = useState<string>("")

  const rowQ = data.questions.find((q) => q.id === rowQId)
  const colQ = data.questions.find((q) => q.id === colQId)

  const matrix = useMemo(() => {
    if (!rowQ || !colQ) return null

    const rowValues = getQuestionValues(rowQ, data.responses)
    const colValues = getQuestionValues(colQ, data.responses)

    const rowLabels = getOptionLabels(rowQ)
    const colLabels = getOptionLabels(colQ)

    // 如果选项为空，从实际数据中提取
    const actualRowLabels =
      rowLabels.length > 0
        ? rowLabels
        : Array.from(new Set(Array.from(rowValues.values()).flat()))
    const actualColLabels =
      colLabels.length > 0
        ? colLabels
        : Array.from(new Set(Array.from(colValues.values()).flat()))

    // 初始化矩阵
    const counts: Record<string, Record<string, number>> = {}
    actualRowLabels.forEach((rl) => {
      counts[rl] = {}
      actualColLabels.forEach((cl) => {
        counts[rl][cl] = 0
      })
    })

    // 填充数据
    data.responses.forEach((r) => {
      const rVals = rowValues.get(r.id) || ["未回答"]
      const cVals = colValues.get(r.id) || ["未回答"]
      rVals.forEach((rv) => {
        cVals.forEach((cv) => {
          const rowKey = actualRowLabels.includes(rv) ? rv : "其他"
          const colKey = actualColLabels.includes(cv) ? cv : "其他"
          if (!counts[rowKey]) counts[rowKey] = {}
          counts[rowKey][colKey] = (counts[rowKey][colKey] || 0) + 1
        })
      })
    })

    return {
      rowLabels: actualRowLabels,
      colLabels: actualColLabels,
      counts,
      total: data.responses.length,
    }
  }, [rowQ, colQ, data.responses])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">行变量：</span>
          <Select value={rowQId} onValueChange={setRowQId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="选择题目" />
            </SelectTrigger>
            <SelectContent>
              {data.questions.map((q, i) => (
                <SelectItem key={q.id} value={q.id}>
                  {i + 1}. {q.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">列变量：</span>
          <Select value={colQId} onValueChange={setColQId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="选择题目" />
            </SelectTrigger>
            <SelectContent>
              {data.questions.map((q, i) => (
                <SelectItem key={q.id} value={q.id}>
                  {i + 1}. {q.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!matrix && (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
          请选择两行题目进行交叉分析
        </div>
      )}

      {matrix && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50">
                  {rowQ?.title} \ {colQ?.title}
                </TableHead>
                {matrix.colLabels.map((cl) => (
                  <TableHead key={cl} className="bg-muted/50 text-center">
                    {cl}
                  </TableHead>
                ))}
                <TableHead className="bg-muted/50 text-center font-bold">
                  合计
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.rowLabels.map((rl) => {
                const rowTotal = matrix.colLabels.reduce(
                  (sum, cl) => sum + (matrix.counts[rl]?.[cl] || 0),
                  0
                )
                return (
                  <TableRow key={rl}>
                    <TableCell className="bg-muted/30 font-medium">
                      {rl}
                    </TableCell>
                    {matrix.colLabels.map((cl) => {
                      const count = matrix.counts[rl]?.[cl] || 0
                      const pct =
                        matrix.total > 0
                          ? ((count / matrix.total) * 100).toFixed(1)
                          : "0.0"
                      return (
                        <TableCell key={cl} className="text-center">
                          <div className="font-medium">{count}</div>
                          <div className="text-xs text-muted-foreground">
                            {pct}%
                          </div>
                        </TableCell>
                      )
                    })}
                    <TableCell className="bg-muted/30 text-center font-bold">
                      {rowTotal}
                    </TableCell>
                  </TableRow>
                )
              })}
              {/* 合计行 */}
              <TableRow>
                <TableCell className="bg-muted/50 font-bold">合计</TableCell>
                {matrix.colLabels.map((cl) => {
                  const colTotal = matrix.rowLabels.reduce(
                    (sum, rl) => sum + (matrix.counts[rl]?.[cl] || 0),
                    0
                  )
                  return (
                    <TableCell
                      key={cl}
                      className="bg-muted/50 text-center font-bold"
                    >
                      {colTotal}
                    </TableCell>
                  )
                })}
                <TableCell className="bg-muted/50 text-center font-bold">
                  {matrix.total}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
