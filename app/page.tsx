"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"

export default function Page() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/surveys")
    }
  }, [status, router])

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        加载中...
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Survey Test</h1>
        <p className="mt-2 text-muted-foreground">
          登录后开始创建和管理你的问卷
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/login">
          <Button>登录</Button>
        </Link>
        <Link href="/register">
          <Button variant="outline">注册</Button>
        </Link>
      </div>
    </div>
  )
}
