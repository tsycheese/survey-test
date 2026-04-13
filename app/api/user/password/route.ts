import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import bcrypt from "bcryptjs"
import { changePasswordSchema } from "@/lib/validations/user"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
      const error = parsed.error.errors[0]
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { currentPassword, newPassword } = parsed.data

    // 获取当前用户
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "当前用户没有设置密码" },
        { status: 400 }
      )
    }

    // 验证当前密码
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ error: "当前密码错误" }, { status: 400 })
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // 更新密码
    await prisma.user.update({
      where: { email: session.user.email },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ message: "密码修改成功" })
  } catch (error) {
    console.error("修改密码错误:", error)
    return NextResponse.json({ error: "修改失败，请稍后重试" }, { status: 500 })
  }
}
