"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Check, X } from "lucide-react"
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
import { registerSchema, type RegisterInput } from "@/lib/validations/auth"

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "至少 8 个字符", valid: password.length >= 8 },
    { label: "包含大写字母", valid: /[A-Z]/.test(password) },
    { label: "包含小写字母", valid: /[a-z]/.test(password) },
    { label: "包含数字", valid: /[0-9]/.test(password) },
  ]

  const strength = checks.filter((c) => c.valid).length

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              level <= strength
                ? strength <= 2
                  ? "bg-destructive"
                  : strength <= 3
                    ? "bg-yellow-500"
                    : "bg-green-500"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((check) => (
          <div
            key={check.label}
            className={`flex items-center text-xs ${
              check.valid ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            {check.valid ? (
              <Check className="mr-1 h-3 w-3" />
            ) : (
              <X className="mr-1 h-3 w-3" />
            )}
            {check.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export function RegisterForm() {
  const [isPending, setIsPending] = useState(false)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "Test1234",
      confirmPassword: "Test1234",
      agreeTerms: false,
    },
  })

  async function onSubmit(values: RegisterInput) {
    setIsPending(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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
          password: values.password,
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
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">注册</CardTitle>
        <CardDescription>创建你的账户，开始使用我们的服务</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户名</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="username"
                      autoCapitalize="none"
                      autoComplete="username"
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
                        autoComplete="new-password"
                        autoCorrect="off"
                        disabled={isPending}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  {field.value && <PasswordStrength password={field.value} />}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>确认密码</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="••••••••"
                        type="password"
                        autoCapitalize="none"
                        autoComplete="new-password"
                        autoCorrect="off"
                        disabled={isPending}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="agreeTerms"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={isPending}
                      />
                      <label className="text-sm text-muted-foreground">
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
              {isPending ? "注册中..." : "注册"}
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
              第三方注册
            </span>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={() => {
              toast.info("Google 注册暂未开启")
            }}
          >
            Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={() => {
              toast.info("GitHub 注册暂未开启")
            }}
          >
            GitHub
          </Button>
        </div>
        <div className="text-center text-sm">
          已有账户？{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            立即登录
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
