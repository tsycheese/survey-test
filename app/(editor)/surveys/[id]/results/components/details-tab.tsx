"use client"

import { useState, useMemo } from "react"
import { Download, Search, Trash2, Filter, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import type { ResultsData, ResponseItem } from "../types"

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

// 从所有回答中提取唯一的筛选选项
function extractFilterOptions(responses: ResponseItem[]) {
  const deviceTypes = new Set<string>()
  const osList = new Set<string>()
  const browsers = new Set<string>()
  const sources = new Set<string>()
  const provinces = new Set<string>()
  const cities = new Set<string>()

  responses.forEach((r) => {
    if (r.deviceType) deviceTypes.add(r.deviceType)
    if (r.os) osList.add(r.os)
    if (r.browser) browsers.add(r.browser)
    if (r.source) sources.add(r.source)
    if (r.province) provinces.add(r.province)
    if (r.city) cities.add(r.city)
  })

  return {
    deviceTypes: Array.from(deviceTypes).sort(),
    osList: Array.from(osList).sort(),
    browsers: Array.from(browsers).sort(),
    sources: Array.from(sources).sort(),
    provinces: Array.from(provinces).sort(),
    cities: Array.from(cities).sort(),
  }
}

type Filters = {
  deviceType: string
  os: string
  browser: string
  source: string
  province: string
  city: string
  startDate: Date | undefined
  endDate: Date | undefined
}

const defaultFilters: Filters = {
  deviceType: "all",
  os: "all",
  browser: "all",
  source: "all",
  province: "all",
  city: "all",
  startDate: undefined,
  endDate: undefined,
}

// 条件查询规则
type QuestionCondition = {
  questionId: string
  type: "answered" | "unanswered" | "selected" | "not_selected"
  optionLabels?: string[]
}

function getQuestionOptions(question: {
  type: string
  config: { options?: { id: string; label: string }[] } | null
}) {
  if (!question.config?.options) return []
  return question.config.options
}

function matchCondition(
  response: ResponseItem,
  condition: QuestionCondition
): boolean {
  const answer = response.answers.find(
    (a) => a.questionId === condition.questionId
  )
  const hasAnswer =
    answer !== undefined && answer.value !== null && answer.value !== ""

  switch (condition.type) {
    case "answered":
      return hasAnswer
    case "unanswered":
      return !hasAnswer
    case "selected": {
      if (!condition.optionLabels || condition.optionLabels.length === 0)
        return false
      if (!hasAnswer) return false
      const val = answer.value
      if (Array.isArray(val)) {
        // 多选题：包含任一已选选项（OR）
        return condition.optionLabels.some((label) => val.includes(label))
      }
      return condition.optionLabels.includes(String(val))
    }
    case "not_selected": {
      if (!condition.optionLabels || condition.optionLabels.length === 0)
        return true
      if (!hasAnswer) return true
      const val = answer.value
      if (Array.isArray(val)) {
        // 多选题：不包含任一已选选项
        return !condition.optionLabels.some((label) => val.includes(label))
      }
      return !condition.optionLabels.includes(String(val))
    }
    default:
      return true
  }
}

export function DetailsTab({
  data,
  onRefresh,
}: {
  data: ResultsData
  onRefresh: () => void
}) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [questionConditions, setQuestionConditions] = useState<
    QuestionCondition[]
  >([])
  const pageSize = 20

  const filterOptions = useMemo(
    () => extractFilterOptions(data.responses),
    [data.responses]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.deviceType !== "all") count++
    if (filters.os !== "all") count++
    if (filters.browser !== "all") count++
    if (filters.source !== "all") count++
    if (filters.province !== "all") count++
    if (filters.city !== "all") count++
    if (filters.startDate) count++
    if (filters.endDate) count++

    return count
  }, [filters])

  const filtered = useMemo(() => {
    let result = data.responses

    // 全局搜索
    if (search.trim()) {
      const s = search.toLowerCase()
      result = result.filter((r) => {
        if (r.deviceType?.toLowerCase().includes(s)) return true
        if (r.os?.toLowerCase().includes(s)) return true
        if (r.browser?.toLowerCase().includes(s)) return true
        if (r.source?.toLowerCase().includes(s)) return true
        if (r.province?.toLowerCase().includes(s)) return true
        if (r.city?.toLowerCase().includes(s)) return true
        return r.answers.some((a) => String(a.value).toLowerCase().includes(s))
      })
    }

    // 条件筛选
    if (filters.deviceType !== "all") {
      result = result.filter((r) => r.deviceType === filters.deviceType)
    }
    if (filters.os !== "all") {
      result = result.filter((r) => r.os === filters.os)
    }
    if (filters.browser !== "all") {
      result = result.filter((r) => r.browser === filters.browser)
    }
    if (filters.source !== "all") {
      result = result.filter((r) => r.source === filters.source)
    }
    if (filters.province !== "all") {
      result = result.filter((r) => r.province === filters.province)
    }
    if (filters.city !== "all") {
      result = result.filter((r) => r.city === filters.city)
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate)
      start.setHours(0, 0, 0, 0)
      result = result.filter((r) => new Date(r.createdAt) >= start)
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate)
      end.setHours(23, 59, 59, 999)
      result = result.filter((r) => new Date(r.createdAt) <= end)
    }

    // 条件查询
    questionConditions.forEach((condition) => {
      result = result.filter((r) => matchCondition(r, condition))
    })

    return result
  }, [data.responses, search, filters, questionConditions])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  // 当前页是否全选
  const allSelectedOnPage =
    paginated.length > 0 && paginated.every((r) => selectedIds.has(r.id))
  // 当前页是否有部分选中
  const someSelectedOnPage =
    paginated.some((r) => selectedIds.has(r.id)) && !allSelectedOnPage

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelectedOnPage) {
        // 取消当前页所有
        paginated.forEach((r) => next.delete(r.id))
      } else {
        // 选中当前页所有
        paginated.forEach((r) => next.add(r.id))
      }
      return next
    })
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return
    setDeleting(true)
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/responses/${id}`, { method: "DELETE" })
      )
      const results = await Promise.all(promises)
      const allOk = results.every((r) => r.ok)
      if (allOk) {
        setSelectedIds(new Set())
        setShowDeleteDialog(false)
        onRefresh()
      } else {
        alert("部分删除失败")
      }
    } catch {
      alert("删除失败")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 搜索和工具栏 */}
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
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              删除选中 ({selectedIds.size})
            </Button>
          )}
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1 h-4 w-4" />
            筛选
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary-foreground px-1.5 py-0.5 text-xs text-primary">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(data)}>
            <Download className="mr-1 h-4 w-4" />
            导出 CSV
          </Button>
        </div>
      </div>

      {/* 条件筛选面板 */}
      {showFilters && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">条件筛选</h3>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters(defaultFilters)
                  setPage(1)
                }}
              >
                <X className="mr-1 h-3 w-3" />
                清除全部
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">设备类型</label>
              <Select
                value={filters.deviceType}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, deviceType: v }))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {filterOptions.deviceTypes.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">操作系统</label>
              <Select
                value={filters.os}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, os: v }))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {filterOptions.osList.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">浏览器</label>
              <Select
                value={filters.browser}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, browser: v }))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {filterOptions.browsers.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">来源</label>
              <Select
                value={filters.source}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, source: v }))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {filterOptions.sources.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">省份</label>
              <Select
                value={filters.province}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, province: v, city: "all" }))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {filterOptions.provinces.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">城市</label>
              <Select
                value={filters.city}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, city: v }))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {filterOptions.cities
                    .filter((c) => {
                      if (filters.province === "all") return true
                      const resp = data.responses.find(
                        (r) => r.city === c && r.province === filters.province
                      )
                      return !!resp
                    })
                    .map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">开始日期</label>
              <DatePicker
                value={filters.startDate}
                onChange={(d) => {
                  setFilters((f) => ({ ...f, startDate: d }))
                  setPage(1)
                }}
                placeholder="选择开始日期"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">结束日期</label>
              <DatePicker
                value={filters.endDate}
                onChange={(d) => {
                  setFilters((f) => ({ ...f, endDate: d }))
                  setPage(1)
                }}
                placeholder="选择结束日期"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* 分割线 + 条件查询 */}
          {data.questions.length > 0 && (
            <>
              <div className="my-4 border-t" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">条件查询</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setQuestionConditions((prev) => [
                        ...prev,
                        { questionId: data.questions[0].id, type: "answered" },
                      ])
                      setPage(1)
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    新增条件
                  </Button>
                </div>
                {questionConditions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    暂无条件查询规则
                  </p>
                ) : (
                  <div className="space-y-2">
                    {questionConditions.map((condition, index) => {
                      const question = data.questions.find(
                        (q) => q.id === condition.questionId
                      )
                      const options = question
                        ? getQuestionOptions(question)
                        : []
                      const isChoice =
                        question?.type === "SINGLE_CHOICE" ||
                        question?.type === "MULTIPLE_CHOICE" ||
                        question?.type === "DROPDOWN" ||
                        question?.type === "IMAGE_SINGLE_CHOICE" ||
                        question?.type === "IMAGE_MULTIPLE_CHOICE"

                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-md border bg-background p-2"
                        >
                          <span className="text-xs text-muted-foreground">
                            {index + 1}.
                          </span>
                          <Select
                            value={condition.questionId}
                            onValueChange={(v) => {
                              setQuestionConditions((prev) => {
                                const next = [...prev]
                                next[index] = {
                                  questionId: v,
                                  type: "answered",
                                }
                                return next
                              })
                              setPage(1)
                            }}
                          >
                            <SelectTrigger className="h-7 w-[180px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {data.questions.map((q) => (
                                <SelectItem key={q.id} value={q.id}>
                                  {q.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={condition.type}
                            onValueChange={(v) => {
                              setQuestionConditions((prev) => {
                                const next = [...prev]
                                next[index] = {
                                  ...next[index],
                                  type: v as QuestionCondition["type"],
                                  optionLabels: undefined,
                                }
                                return next
                              })
                              setPage(1)
                            }}
                          >
                            <SelectTrigger className="h-7 w-[120px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="answered">已答</SelectItem>
                              <SelectItem value="unanswered">未答</SelectItem>
                              {isChoice && (
                                <>
                                  <SelectItem value="selected">选中</SelectItem>
                                  <SelectItem value="not_selected">
                                    未选中
                                  </SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>

                          {(condition.type === "selected" ||
                            condition.type === "not_selected") &&
                            options.length > 0 && (
                              <div className="relative">
                                <Select
                                  value={condition.optionLabels?.[0] || ""}
                                  onValueChange={() => {}}
                                >
                                  <SelectTrigger className="h-7 w-[180px] text-xs">
                                    <span className="truncate">
                                      {condition.optionLabels &&
                                      condition.optionLabels.length > 0
                                        ? condition.optionLabels.join("、")
                                        : "请选择"}
                                    </span>
                                  </SelectTrigger>
                                  <SelectContent className="w-[200px]">
                                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                      选择多个选项，选项间条件为或
                                    </div>
                                    {options.map((opt) => (
                                      <div
                                        key={opt.id}
                                        className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-accent"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setQuestionConditions((prev) => {
                                            const next = [...prev]
                                            const currentLabels =
                                              next[index].optionLabels || []
                                            const newLabels =
                                              currentLabels.includes(opt.label)
                                                ? currentLabels.filter(
                                                    (l) => l !== opt.label
                                                  )
                                                : [...currentLabels, opt.label]
                                            next[index] = {
                                              ...next[index],
                                              optionLabels: newLabels,
                                            }
                                            return next
                                          })
                                        }}
                                      >
                                        <Checkbox
                                          checked={
                                            condition.optionLabels?.includes(
                                              opt.label
                                            ) || false
                                          }
                                        />
                                        <span className="text-xs">
                                          {opt.label}
                                        </span>
                                      </div>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="ml-auto h-6 w-6 text-muted-foreground"
                            onClick={() => {
                              setQuestionConditions((prev) =>
                                prev.filter((_, i) => i !== index)
                              )
                              setPage(1)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 数据表格 */}
      <div className="flex h-[600px] flex-col rounded-lg border">
        <div className="flex-1 overflow-auto rounded-lg">
          <Table className="w-max min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 w-[40px] shrink-0 bg-background">
                  <Checkbox
                    checked={allSelectedOnPage}
                    data-indeterminate={someSelectedOnPage}
                    onCheckedChange={toggleSelectAllOnPage}
                    aria-label="全选当前页"
                  />
                </TableHead>
                <TableHead className="w-[160px] shrink-0">提交时间</TableHead>
                <TableHead className="w-[100px] shrink-0">完成时长</TableHead>
                <TableHead className="w-[80px] shrink-0">设备</TableHead>
                <TableHead className="w-[100px] shrink-0">系统</TableHead>
                <TableHead className="w-[100px] shrink-0">浏览器</TableHead>
                <TableHead className="w-[120px] shrink-0">来源</TableHead>
                <TableHead className="w-[80px] shrink-0">省份</TableHead>
                <TableHead className="w-[80px] shrink-0">城市</TableHead>
                {data.questions.map((q, index) => (
                  <TableHead key={q.id} className="w-[160px] shrink-0">
                    {index + 1}. {q.title}
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
                      <TableCell className="sticky left-0 z-10 w-[40px] shrink-0 bg-background">
                        <Checkbox
                          checked={selectedIds.has(r.id)}
                          onCheckedChange={() => toggleSelect(r.id)}
                          aria-label={`选择 ${r.id}`}
                        />
                      </TableCell>
                      <TableCell className="w-[160px] shrink-0 text-xs">
                        {formatDateTime(r.createdAt)}
                      </TableCell>
                      <TableCell className="w-[100px] shrink-0 text-xs">
                        {formatDuration(r.startedAt, r.completedAt)}
                      </TableCell>
                      <TableCell className="w-[80px] shrink-0 text-xs">
                        {r.deviceType || "-"}
                      </TableCell>
                      <TableCell className="w-[100px] shrink-0 text-xs">
                        {r.os || "-"}
                      </TableCell>
                      <TableCell className="w-[100px] shrink-0 text-xs">
                        {r.browser || "-"}
                      </TableCell>
                      <TableCell className="w-[120px] shrink-0 text-xs">
                        {r.source || "-"}
                      </TableCell>
                      <TableCell className="w-[80px] shrink-0 text-xs">
                        {r.province || "-"}
                      </TableCell>
                      <TableCell className="w-[80px] shrink-0 text-xs">
                        {r.city || "-"}
                      </TableCell>
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
                            className="w-[160px] shrink-0 truncate text-xs"
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
      </div>

      {/* 分页 */}
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

      {/* 批量删除确认弹窗 */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(o) => !o && setShowDeleteDialog(false)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              此操作将永久删除选中的 {selectedIds.size}{" "}
              条回答数据，无法恢复。是否继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={deleting}
            >
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
