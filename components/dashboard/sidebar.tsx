"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"

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
          const isSubPathMatch = pathname.startsWith(item.href + "/")
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

      {/* 用户信息区域 */}
      <div className="space-y-1 border-t p-3">
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user?.name || "用户"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="mb-2 w-64" align="center" side="top">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {user?.name || "用户"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href="/settings">
                    <Settings className="mr-1 h-3.5 w-3.5" />
                    个人设置
                  </Link>
                </Button>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

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
