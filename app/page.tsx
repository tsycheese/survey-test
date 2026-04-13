"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import {
  ParticleBackground,
  SurveyIcon,
  FeatureCards,
} from "@/components/landing"

export default function Page() {
  const { status } = useSession()
  const router = useRouter()
  const initialized = useRef(false)
  const [titleVisible, setTitleVisible] = useState(false)
  const [subtitleVisible, setSubtitleVisible] = useState(false)
  const [buttonsVisible, setButtonsVisible] = useState(false)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      const t1 = setTimeout(() => setTitleVisible(true), 200)
      const t2 = setTimeout(() => setSubtitleVisible(true), 600)
      const t3 = setTimeout(() => setButtonsVisible(true), 1400)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    }
  }, [])

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
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden">
      {/* 粒子背景 */}
      <ParticleBackground />

      {/* 渐变遮罩 - 顶部和底部 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-background to-transparent" />

      {/* 主内容 */}
      <div className="relative z-20 flex flex-col items-center px-6">
        {/* Logo 图标 */}
        <div className="scale-100 opacity-100 transition-all duration-700">
          <SurveyIcon />
        </div>

        {/* 标题 */}
        <div
          className={`mt-6 text-center transition-all duration-700 ${
            titleVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Survey Test
          </h1>
        </div>

        {/* 副标题 */}
        <div
          className={`mt-3 text-center transition-all duration-700 ${
            subtitleVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <p className="max-w-md text-lg text-muted-foreground">
            轻量 · 协作 · 实时
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            创建精美的问卷，与团队实时协作
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="mt-10">
          <FeatureCards />
        </div>

        {/* 按钮 */}
        <div
          className={`mt-10 flex gap-3 transition-all duration-700 ${
            buttonsVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <Link href="/login">
            <Button size="lg" className="min-w-24">
              登录
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg" className="min-w-24">
              注册
            </Button>
          </Link>
        </div>
      </div>

      {/* 底部装饰 */}
      <div className="absolute right-0 bottom-6 left-0 z-20 flex justify-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>按</span>
          <kbd className="rounded-md border bg-muted px-2 py-1 font-mono text-[10px]">
            D
          </kbd>
          <span>切换主题</span>
        </div>
      </div>
    </div>
  )
}
