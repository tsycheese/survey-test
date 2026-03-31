import { signOut } from "@/lib/auth"

export async function POST() {
  await signOut({ redirect: false })
  return Response.json({ message: "已退出登录" })
}
