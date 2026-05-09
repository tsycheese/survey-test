"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
  ArrowLeft,
  Mail,
  Lock,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

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
import { ParticleBackground } from "@/components/landing"
import { passwordSchema } from "@/lib/validations/auth"

const forgotPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
})

const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    code: z.string().length(6, "验证码应为 6 位数字"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  })

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

type Step = "email" | "verify" | "success"

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const emailForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      code: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function startCountdown() {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function onSendCode(values: ForgotPasswordInput) {
    setIsPending(true)
    try {
      const res = await fetch("/api/auth/forgot-password/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      setEmail(values.email)
      resetForm.setValue("email", values.email)
      setStep("verify")
      startCountdown()
      toast.success(data.message)
    } catch {
      toast.error("发送失败，请稍后重试")
    } finally {
      setIsPending(false)
    }
  }

  async function onResendCode() {
    if (countdown > 0) return
    setIsPending(true)
    try {
      const res = await fetch("/api/auth/forgot-password/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      startCountdown()
      toast.success("验证码已重新发送")
    } catch {
      toast.error("发送失败，请稍后重试")
    } finally {
      setIsPending(false)
    }
  }

  async function onResetPassword(values: ResetPasswordInput) {
    setIsPending(true)
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          code: values.code,
          password: values.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      setStep("success")
      toast.success(data.message)
    } catch {
      toast.error("重置失败，请稍后重试")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6">
      <ParticleBackground />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/50 via-background/20 to-background/50" />

      <Link
        href="/login"
        className="absolute top-6 left-6 z-50 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回登录
      </Link>

      <div className="relative z-20 w-full max-w-md">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 opacity-50 blur-xl" />
        <div className="relative rounded-2xl border bg-card/80 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col items-center px-6 pt-8 pb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              {step === "success" ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : (
                <KeyRound className="h-6 w-6 text-primary" />
              )}
            </div>
            <h1 className="mt-4 text-2xl font-bold">
              {step === "email" && "忘记密码"}
              {step === "verify" && "验证邮箱"}
              {step === "success" && "重置成功"}
            </h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {step === "email" && "输入您的邮箱，我们将发送验证码"}
              {step === "verify" && `验证码已发送至 ${email}`}
              {step === "success" && "您的密码已重置，请使用新密码登录"}
            </p>
          </div>

          <div className="px-6 pb-8">
            {step === "email" && (
              <Form {...emailForm}>
                <form
                  onSubmit={emailForm.handleSubmit(onSendCode)}
                  className="space-y-4"
                >
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>邮箱</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="your@email.com"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? "发送中..." : "发送验证码"}
                  </Button>
                </form>
              </Form>
            )}

            {step === "verify" && (
              <Form {...resetForm}>
                <form
                  onSubmit={resetForm.handleSubmit(onResetPassword)}
                  className="space-y-4"
                >
                  <FormField
                    control={resetForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>验证码</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <KeyRound className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="请输入 6 位验证码"
                              maxLength={6}
                              className="pl-10 text-center text-lg tracking-[0.5em]"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={onResendCode}
                            disabled={countdown > 0 || isPending}
                            className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                          >
                            {countdown > 0
                              ? `${countdown} 秒后重新发送`
                              : "重新发送验证码"}
                          </button>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>新密码</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="至少 8 位，包含大小写字母和数字"
                              className="pr-10 pl-10"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>确认密码</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="再次输入新密码"
                              className="pr-10 pl-10"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((v) => !v)}
                              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? "重置中..." : "重置密码"}
                  </Button>
                </form>
              </Form>
            )}

            {step === "success" && (
              <div className="space-y-4">
                <Button asChild className="w-full">
                  <Link href="/login">前往登录</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
