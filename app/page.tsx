"use client"

import Link from "next/link"
import { LogOut, User } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { useSession } from "next-auth/react"

export default function Page() {
  const { data: session } = useSession()

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      window.location.href = "/login"
    } catch {
      toast.error("退出登录失败")
    }
  }

  return (
    <div className="flex min-h-svh flex-col p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Survey Test</h1>
        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {session.user.name || session.user.email}
              </span>
              <form action={handleLogout}>
                <Button type="submit" variant="outline" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  退出
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  登录
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  <User className="mr-2 h-4 w-4" />
                  注册
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center">
        <div className="flex max-w-md min-w-0 flex-col gap-4 text-center text-sm leading-loose">
          <div>
            <h1 className="text-2xl font-medium">
              {session?.user
                ? `欢迎回来，${session.user.name || "用户"}!`
                : "欢迎来到 Survey Test"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {session?.user
                ? "你已成功登录，可以开始使用我们的服务了。"
                : "登录或注册账户，开始使用我们的问卷调查服务。"}
            </p>
          </div>
          {!session?.user && (
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/login">
                <Button>立即登录</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline">免费注册</Button>
              </Link>
            </div>
          )}
          <div className="mt-8 font-mono text-xs text-muted-foreground">
            (按 <kbd className="rounded bg-muted px-1 py-0.5">d</kbd>{" "}
            切换深色模式)
          </div>
        </div>
      </main>
    </div>
  )
}
