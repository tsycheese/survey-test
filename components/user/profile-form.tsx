"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { User, Check, AlertCircle } from "lucide-react"
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validations/user"

type UserProfile = {
  id: string
  name: string | null
  email: string
  emailVerified: Date | null
  image: string | null
  createdAt: Date
}

export function ProfileForm() {
  const [loading, setLoading] = useState(true)
  const [isPending, setIsPending] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
    },
  })

  useEffect(() => {
    fetchUserProfile()
  }, [])

  async function fetchUserProfile() {
    try {
      const res = await fetch("/api/user/profile")
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      setUser(data.user)
      form.setValue("name", data.user.name || "")
    } catch {
      toast.error("获取用户信息失败")
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(values: UpdateProfileInput) {
    setIsPending(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      toast.success("资料更新成功")
      fetchUserProfile()
    } catch {
      toast.error("更新失败，请稍后重试")
    } finally {
      setIsPending(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>个人资料</CardTitle>
            <CardDescription>管理你的个人信息</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户名</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="username"
                        autoCapitalize="none"
                        autoComplete="username"
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

            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="cursor-not-allowed bg-muted/50"
                  />
                  {user?.emailVerified && (
                    <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-xs text-green-600">
                      <Check className="h-3.5 w-3.5" />
                      <span>已验证</span>
                    </div>
                  )}
                </div>
              </FormControl>
              <p className="text-xs text-muted-foreground">
                邮箱地址不支持修改
              </p>
            </FormItem>

            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>账户信息：</p>
                  <ul className="ml-1 list-inside list-disc space-y-0.5">
                    <li>
                      创建于{" "}
                      {new Date(user?.createdAt || "").toLocaleDateString(
                        "zh-CN"
                      )}
                    </li>
                    <li>用户名可包含字母、数字、下划线和中文</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : "保存更改"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
