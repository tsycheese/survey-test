"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Users, Shield, Eye, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function InvitePage() {
  const router = useRouter()
  const { surveyId, code } = useParams<{
    surveyId: string
    code: string
  }>()

  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<{
    survey: { id: string; title: string }
    permissions: { canEdit: boolean; canViewResults: boolean }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 页面加载时自动验证
  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/invites/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surveyId, code: code.toUpperCase() }),
        })

        if (res.ok) {
          const data = await res.json()
          setInviteInfo(data)
        } else {
          const err = await res.json()
          setError(err.error || "邀请码无效或已过期")
        }
      } catch {
        setError("验证失败")
      } finally {
        setLoading(false)
      }
    }

    validate()
  }, [surveyId, code])

  async function handleJoin() {
    setJoining(true)
    try {
      const res = await fetch(`/api/invites/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId, code: code.toUpperCase() }),
      })

      if (res.ok) {
        toast.success("加入成功！")
        router.push(`/surveys/${surveyId}/edit`)
      } else {
        const err = await res.json()
        toast.error(err.error || "加入失败")
      }
    } catch {
      toast.error("加入失败")
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col">
      {/* 顶部导航 */}
      <header className="flex h-14 items-center border-b px-4">
        <Link href="/surveys">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回
          </Button>
        </Link>
      </header>

      {/* 主内容 */}
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>加入问卷协作</CardTitle>
            <CardDescription>
              {loading
                ? "正在验证邀请链接..."
                : error
                  ? "邀请链接无效"
                  : "确认加入以下问卷"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">验证中...</p>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
                  {error}
                </div>
                <Button className="w-full" asChild>
                  <Link href="/surveys">返回问卷列表</Link>
                </Button>
              </div>
            ) : inviteInfo ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="mb-3 text-sm text-muted-foreground">
                    您即将加入以下问卷：
                  </div>
                  <div className="text-lg font-medium">
                    {inviteInfo.survey.title}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {inviteInfo.permissions.canEdit && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Shield className="h-3 w-3" />
                        可编辑
                      </span>
                    )}
                    {inviteInfo.permissions.canViewResults && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Eye className="h-3 w-3" />
                        可查看结果
                      </span>
                    )}
                    {!inviteInfo.permissions.canEdit &&
                      !inviteInfo.permissions.canViewResults && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                          仅查看
                        </span>
                      )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/surveys")}
                    disabled={joining}
                  >
                    取消
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleJoin}
                    disabled={joining}
                  >
                    {joining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        加入中...
                      </>
                    ) : (
                      "确认加入"
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
