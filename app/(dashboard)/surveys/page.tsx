"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  PlusCircle,
  BarChart2,
  Edit,
  Trash2,
  Share2,
  LogOut,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Survey = {
  id: string
  title: string
  description: string | null
  published: boolean
  shareToken: string
  createdAt: string
  _count: { questions: number; responses: number }
}

export default function SurveysPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/surveys")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setSurveys(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm("确定要删除这份问卷吗？")) return
    const res = await fetch(`/api/surveys/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("删除成功")
      setSurveys((prev) => prev.filter((s) => s.id !== id))
    } else {
      toast.error("删除失败")
    }
  }

  async function handleTogglePublish(survey: Survey) {
    const res = await fetch(`/api/surveys/${survey.id}/publish`, {
      method: "POST",
    })
    if (res.ok) {
      const updated = await res.json()
      setSurveys((prev) =>
        prev.map((s) =>
          s.id === survey.id ? { ...s, published: updated.published } : s
        )
      )
      toast.success(updated.published ? "已发布" : "已取消发布")
    } else {
      toast.error("操作失败")
    }
  }

  function handleCopyLink(token: string) {
    const url = `${window.location.origin}/s/${token}`
    navigator.clipboard.writeText(url)
    toast.success("链接已复制")
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <div className="min-h-svh p-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">我的问卷</h1>
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push("/surveys/new")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              新建问卷
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              退出
            </Button>
          </div>
        </header>

        {loading ? (
          <p className="text-muted-foreground">加载中...</p>
        ) : surveys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground">
              还没有问卷，点击「新建问卷」开始
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {surveys.map((survey) => (
              <Card key={survey.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{survey.title}</CardTitle>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        survey.published
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {survey.published ? "已发布" : "草稿"}
                    </span>
                  </div>
                  {survey.description && (
                    <CardDescription>{survey.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {survey._count.questions} 题 · {survey._count.responses}{" "}
                  份回答
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/surveys/${survey.id}/edit`)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTogglePublish(survey)}
                  >
                    {survey.published ? "取消发布" : "发布"}
                  </Button>
                  {survey.published && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(survey.shareToken)}
                    >
                      <Share2 className="mr-1 h-3 w-3" />
                      复制链接
                    </Button>
                  )}
                  <Link href={`/surveys/${survey.id}/results`}>
                    <Button variant="outline" size="sm">
                      <BarChart2 className="mr-1 h-3 w-3" />
                      统计
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(survey.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    删除
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
