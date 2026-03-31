"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"

export function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const [isPending, setIsPending] = useState(false)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "Test1234",
    },
  })

  async function onSubmit(values: LoginInput) {
    setIsPending(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      window.location.href = callbackUrl
    } catch {
      toast.error("登录失败，请稍后重试")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">登录</CardTitle>
        <CardDescription>输入你的邮箱和密码登录账户</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="name@example.com"
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>密码</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="••••••••"
                        type="password"
                        autoCapitalize="none"
                        autoComplete="current-password"
                        autoCorrect="off"
                        disabled={isPending}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-[0.8rem] text-muted-foreground">
                    默认密码：Test1234
                  </p>
                </FormItem>
              )}
            />
            <label className="flex cursor-pointer items-center space-x-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                disabled={isPending}
              />
              <span className="text-muted-foreground">记住我</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              忘记密码？
            </Link>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "登录中..." : "登录"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              第三方登录
            </span>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={() => {
              // TODO: 配置 Google OAuth 后启用
              toast.info("Google 登录暂未开启")
            }}
          >
            Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={() => {
              // TODO: 配置 GitHub OAuth 后启用
              toast.info("GitHub 登录暂未开启")
            }}
          >
            GitHub
          </Button>
        </div>
        <div className="text-center text-sm">
          还没有账户？{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            立即注册
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
