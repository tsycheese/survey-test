import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/dashboard/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-svh">
      <div className="fixed top-0 left-0 h-svh w-56">
        <Sidebar user={session.user} />
      </div>
      <main className="ml-56 flex-1 bg-muted/30">{children}</main>
    </div>
  )
}
