"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Edit, BarChart2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type SharedSurvey = {
  id: string
  title: string
  description: string | null
  published: boolean
  canEdit: boolean
  canViewResults: boolean
  owner: {
    name: string | null
    email: string
  }
  _count: {
    questions: number
    responses: number
  }
}

export default function SharedSurveysPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<SharedSurvey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/surveys/shared")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setSurveys(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/surveys">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">我参与的问卷</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {surveys.length} 份协作问卷
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          加载中...
        </div>
      ) : surveys.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center gap-4 rounded-xl border border-dashed text-muted-foreground">
          <p>还没有参与的问卷</p>
          <p className="text-sm">接受他人邀请后即可在这里查看</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <Card key={survey.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2 text-base">
                    {survey.title}
                  </CardTitle>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      survey.published
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {survey.published ? "已发布" : "草稿"}
                  </span>
                </div>
                {survey.description && (
                  <CardDescription className="line-clamp-2">
                    {survey.description}
                  </CardDescription>
                )}
                <div className="mt-1 text-xs text-muted-foreground">
                  创建者：{survey.owner.name || survey.owner.email}
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{survey._count.questions} 道题</span>
                  <span>{survey._count.responses} 份回答</span>
                </div>
                <div className="mt-2 flex gap-2">
                  {survey.canEdit && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      可编辑
                    </span>
                  )}
                  {survey.canViewResults && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      可查看结果
                    </span>
                  )}
                </div>
              </CardContent>
              <div className="mt-auto flex gap-2 p-4 pt-2">
                {survey.canEdit ? (
                  <>
                    <Link
                      href={`/surveys/${survey.id}/edit`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="mr-1 h-3 w-3" />
                        编辑
                      </Button>
                    </Link>
                    <Link
                      href={`/s/${survey.id}?preview=1`}
                      className="flex-1"
                      target="_blank"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        预览
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link
                    href={`/s/${survey.id}?preview=1`}
                    className="flex-1"
                    target="_blank"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      预览
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
