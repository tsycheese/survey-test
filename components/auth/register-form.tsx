"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { ArrowLeft, Mail, Sparkles, Check } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { registerSchema, type RegisterInput } from "@/lib/validations/auth"
import { ParticleBackground } from "@/components/landing"

export function RegisterForm() {
  const [isPending, setIsPending] = useState(false)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      agreeTerms: false,
    },
  })

  async function onSubmit(values: RegisterInput) {
    setIsPending(true)
    try {
      // 从邮箱生成用户名（@ 之前的部分）
      const username = values.email.split("@")[0]
      // 默认密码
      const password = "Test1234"

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email: values.email,
          password,
          confirmPassword: password,
          agreeTerms: values.agreeTerms,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password,
        }),
      })
      const loginData = await loginRes.json()
      if (!loginRes.ok) {
        toast.error(loginData.error)
        return
      }
      window.location.href = "/"
    } catch {
      toast.error("注册失败，请稍后重试")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6">
      {/* 粒子背景 */}
      <ParticleBackground />

      {/* 渐变遮罩 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/50 via-background/20 to-background/50" />

      {/* 返回按钮 */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-50 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </Link>

      {/* 注册卡片 */}
      <div className="relative z-20 w-full max-w-md">
        {/* 装饰性光晕 */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 opacity-50 blur-xl" />

        <div className="relative rounded-2xl border bg-card/80 shadow-xl backdrop-blur-xl">
          {/* 头部 */}
          <div className="flex flex-col items-center px-6 pt-8 pb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">创建账户</h1>
            <p className="text-sm text-muted-foreground">
              输入邮箱，立即开始使用
            </p>
          </div>

          {/* 表单 */}
          <div className="px-6 pb-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="name@example.com"
                            type="email"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            disabled={isPending}
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 提示信息 */}
                <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span className="text-muted-foreground">
                      用户名将自动设置为邮箱前缀（
                      <code className="rounded bg-muted px-1">@</code>
                      之前的部分）
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span className="text-muted-foreground">
                      初始密码为{" "}
                      <code className="rounded bg-muted px-1">Test1234</code>
                      ，登录后可以在个人中心修改
                    </span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="agreeTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-muted"
                            checked={field.value}
                            onChange={field.onChange}
                            disabled={isPending}
                          />
                          <label className="text-sm leading-relaxed text-muted-foreground">
                            我同意{" "}
                            <Link
                              href="/terms"
                              className="text-primary hover:underline"
                            >
                              服务条款
                            </Link>{" "}
                            和{" "}
                            <Link
                              href="/privacy"
                              className="text-primary hover:underline"
                            >
                              隐私政策
                            </Link>
                          </label>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      创建账户...
                    </span>
                  ) : (
                    "创建账户"
                  )}
                </Button>
              </form>
            </Form>
          </div>

          {/* 底部 */}
          <div className="rounded-b-2xl border-t bg-muted/30 px-6 py-4">
            <p className="text-center text-sm text-muted-foreground">
              已有账户？{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                立即登录
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
