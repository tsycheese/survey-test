"use client"

import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LockInfo } from "@/lib/pusher"

interface LockIndicatorProps {
  lockInfo: LockInfo | undefined
  isLockedByMe: boolean
}

export function LockIndicator({ lockInfo, isLockedByMe }: LockIndicatorProps) {
  if (!lockInfo) return null

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        isLockedByMe
          ? "bg-primary/10 text-primary"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      )}
    >
      <Lock className="h-3 w-3" />
      <span>
        {isLockedByMe ? "我正在编辑" : `${lockInfo.userName || "有人"}正在编辑`}
      </span>
    </div>
  )
}

interface QuestionLockOverlayProps {
  lockInfo: LockInfo | undefined
  isLockedByMe: boolean
}

export function QuestionLockOverlay({
  lockInfo,
  isLockedByMe,
}: QuestionLockOverlayProps) {
  // 不显示遮罩，高亮框由父组件通过 className 控制
  return null
}
