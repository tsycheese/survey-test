"use client"

import { useState, useMemo } from "react"
import { Download, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ResultsData } from "../types"

function formatDuration(
  startedAt: string | null,
  completedAt: string | null
): string {
  if (!startedAt || !completedAt) return "-"
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}秒`
  const mins = Math.floor(secs / 60)
  const remainingSecs = secs % 60
  return `${mins}分${remainingSecs}秒`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function downloadCSV(data: ResultsData) {
  const headers = [
    "提交时间",
    "完成时长",
    "设备",
    "系统",
    "浏览器",
    "来源",
    "省份",
    "城市",
    ...data.questions.map((q) => q.title),
  ]

  const rows = data.responses.map((r) => {
    const answerMap = new Map(r.answers.map((a) => [a.questionId, a.value]))
    return [
      formatDateTime(r.createdAt),
      formatDuration(r.startedAt, r.completedAt),
      r.deviceType || "-",
      r.os || "-",
      r.browser || "-",
      r.source || "-",
      r.province || "-",
      r.city || "-",
      ...data.questions.map((q) => {
        const val = answerMap.get(q.id)
        if (val === undefined || val === null) return ""
        if (Array.isArray(val)) return val.join(", ")
        return String(val)
      }),
    ]
  })

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell).replace(/"/g, '""')
          return `"${str}"`
        })
        .join(",")
    )
    .join("\n")

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${data.survey.title}_数据导出_${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function DetailsTab({ data }: { data: ResultsData }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 20

  const filtered = useMemo(() => {
    if (!search.trim()) return data.responses
    const s = search.toLowerCase()
    return data.responses.filter((r) => {
      // 搜索设备信息
      if (r.deviceType?.toLowerCase().includes(s)) return true
      if (r.os?.toLowerCase().includes(s)) return true
      if (r.browser?.toLowerCase().includes(s)) return true
      if (r.source?.toLowerCase().includes(s)) return true
      // 搜索答案内容
      return r.answers.some((a) => String(a.value).toLowerCase().includes(s))
    })
  }, [data.responses, search])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索设备、答案内容..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCSV(data)}>
          <Download className="mr-1 h-4 w-4" />
          导出 CSV
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">提交时间</TableHead>
              <TableHead className="w-[100px]">完成时长</TableHead>
              <TableHead className="w-[80px]">设备</TableHead>
              <TableHead className="w-[100px]">系统</TableHead>
              <TableHead className="w-[100px]">浏览器</TableHead>
              <TableHead>来源</TableHead>
              <TableHead className="w-[80px]">省份</TableHead>
              <TableHead className="w-[80px]">城市</TableHead>
              {data.questions.map((q) => (
                <TableHead key={q.id} className="min-w-[120px]">
                  {q.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8 + data.questions.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((r) => {
                const answerMap = new Map(
                  r.answers.map((a) => [a.questionId, a.value])
                )
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      {formatDateTime(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDuration(r.startedAt, r.completedAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.deviceType || "-"}
                    </TableCell>
                    <TableCell className="text-xs">{r.os || "-"}</TableCell>
                    <TableCell className="text-xs">
                      {r.browser || "-"}
                    </TableCell>
                    <TableCell className="text-xs">{r.source || "-"}</TableCell>
                    <TableCell className="text-xs">
                      {r.province || "-"}
                    </TableCell>
                    <TableCell className="text-xs">{r.city || "-"}</TableCell>
                    {data.questions.map((q) => {
                      const val = answerMap.get(q.id)
                      let display = "-"
                      if (val !== undefined && val !== null) {
                        if (Array.isArray(val)) display = val.join(", ")
                        else display = String(val)
                      }
                      return (
                        <TableCell
                          key={q.id}
                          className="max-w-[200px] truncate text-xs"
                        >
                          {display}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {filtered.length} 条，第 {page} / {totalPages} 页
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
