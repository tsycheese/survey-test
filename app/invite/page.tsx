"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function InvitePage() {
  const router = useRouter()
  const [surveyId, setSurveyId] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!surveyId.trim() || !code.trim()) {
      toast.error("请输入问卷ID和邀请码")
      return
    }

    setLoading(true)
    try {
      // 验证邀请码
      const validateRes = await fetch(`/api/invites/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: surveyId.trim(),
          code: code.trim().toUpperCase(),
        }),
      })

      if (!validateRes.ok) {
        const err = await validateRes.json()
        toast.error(err.error || "邀请码无效或已过期")
        setLoading(false)
        return
      }

      // 加入协作
      const joinRes = await fetch(`/api/invites/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: surveyId.trim(),
          code: code.trim().toUpperCase(),
        }),
      })

      if (joinRes.ok) {
        toast.success("加入成功！")
        router.push(`/surveys/${surveyId}/edit`)
      } else {
        const err = await joinRes.json()
        toast.error(err.error || "加入失败")
      }
    } catch {
      toast.error("操作失败")
    } finally {
      setLoading(false)
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
              输入问卷ID和邀请码，加入他人创建的问卷
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">问卷ID</label>
                <Input
                  placeholder="请输入问卷ID"
                  value={surveyId}
                  onChange={(e) => setSurveyId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  问卷ID通常在邀请链接中，如 /invite/xxx/yyy 中的 xxx
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">邀请码</label>
                <Input
                  placeholder="请输入6位邀请码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center tracking-widest"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !surveyId.trim() || !code.trim()}
              >
                {loading ? "处理中..." : "加入协作"}
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-muted-foreground">
              <p>也可以直接点击邀请链接自动加入</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
