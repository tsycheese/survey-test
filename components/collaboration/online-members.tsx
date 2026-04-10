"use client"

import { useState } from "react"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MemberInfo } from "@/lib/pusher"

interface OnlineMembersProps {
  members: Map<string, MemberInfo>
  currentUserId: string | null
  isConnected?: boolean
}

export function OnlineMembers({
  members,
  currentUserId,
  isConnected,
}: OnlineMembersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const membersList = Array.from(members.values())
  const visibleMembers = membersList.slice(0, 3)
  const remainingCount = membersList.length - 3

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>连接中...</span>
      </div>
    )
  }

  if (membersList.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>只有您在线</span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* 成员头像堆叠 */}
      <div className="flex -space-x-2">
        {visibleMembers.map((member) => (
          <MemberAvatar
            key={member.userId}
            member={member}
            isCurrentUser={member.userId === currentUserId}
          />
        ))}
        {remainingCount > 0 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
            +{remainingCount}
          </div>
        )}
      </div>

      {/* 在线人数 */}
      <span className="text-sm text-muted-foreground">
        {membersList.length} 人在线
      </span>

      {/* 悬停展开的成员列表 */}
      {isExpanded && (
        <div className="absolute top-full right-0 z-50 mt-2 w-56 rounded-lg border bg-popover p-2 shadow-lg">
          <div className="mb-2 px-2 py-1 text-xs font-medium text-muted-foreground">
            在线成员
          </div>
          <div className="space-y-1">
            {membersList.map((member) => (
              <div
                key={member.userId}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5",
                  member.userId === currentUserId && "bg-muted"
                )}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">
                  {member.name?.[0] || "?"}
                </div>
                <span className="flex-1 truncate text-sm">
                  {member.name || "匿名用户"}
                </span>
                {member.userId === currentUserId && (
                  <span className="text-xs text-muted-foreground">我</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MemberAvatar({
  member,
  isCurrentUser,
}: {
  member: MemberInfo
  isCurrentUser: boolean
}) {
  const initials = member.name?.[0] || "?"

  // 根据 userId 生成固定的颜色
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ]
  const colorIndex = member.userId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const bgColor = colors[colorIndex % colors.length]

  return (
    <div
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-xs font-medium text-white",
        bgColor,
        isCurrentUser && "ring-2 ring-primary ring-offset-1"
      )}
      title={member.name || "匿名用户"}
    >
      {initials}
    </div>
  )
}
