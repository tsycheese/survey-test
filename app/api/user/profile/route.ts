import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { updateProfileSchema } from "@/lib/validations/user"

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      const error = parsed.error.errors[0]
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { name } = parsed.data

    // 检查用户名是否已存在（排除当前用户）
    const existingUser = await prisma.user.findFirst({
      where: {
        name,
        email: { not: session.user.email },
      },
    })

    if (existingUser) {
      return NextResponse.json({ error: "该用户名已被使用" }, { status: 400 })
    }

    // 更新用户资料
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { name },
    })

    return NextResponse.json({
      message: "资料更新成功",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
    })
  } catch (error) {
    console.error("更新资料错误:", error)
    return NextResponse.json({ error: "更新失败，请稍后重试" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("获取用户信息错误:", error)
    return NextResponse.json({ error: "获取失败，请稍后重试" }, { status: 500 })
  }
}
