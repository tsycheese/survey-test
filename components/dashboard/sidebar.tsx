"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  User,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

type SidebarUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

const navItems = [
  {
    label: "我的问卷",
    href: "/surveys",
    icon: ClipboardList,
  },
  {
    label: "我参与的问卷",
    href: "/surveys/shared",
    icon: Users,
  },
]

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <aside className="flex h-svh w-56 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/surveys" className="flex items-center gap-2 font-bold">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <span>Survey Test</span>
        </Link>
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isExactMatch = pathname === item.href
          // 子路径匹配：当前路径以 item.href + "/" 开头
          // 但要排除当前路径是其他菜单的精确匹配或子路径的情况
          const isSubPathMatch = pathname.startsWith(item.href + "/")
          // 检查是否有其他菜单更精确地匹配当前路径
          const hasMoreSpecificMatch = navItems.some(
            (other) =>
              other.href !== item.href &&
              (pathname === other.href || pathname.startsWith(other.href + "/"))
          )
          const active =
            isExactMatch || (isSubPathMatch && !hasMoreSpecificMatch)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* 用户信息 */}
      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-2 rounded-md px-3 py-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user.name || "用户"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </div>
    </aside>
  )
}
