import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/prisma"
import { registerSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 先验证邮箱和同意条款
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      const error = parsed.error.errors[0]
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { email, agreeTerms } = parsed.data

    if (!agreeTerms) {
      return NextResponse.json({ error: "必须同意服务条款" }, { status: 400 })
    }

    // 从邮箱生成用户名（@ 之前的部分）
    const username = email.split("@")[0]

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (existingEmail) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 400 })
    }

    // 检查用户名是否已存在，如果存在则添加数字后缀
    let finalUsername = username
    let counter = 1
    while (await prisma.user.findFirst({ where: { name: finalUsername } })) {
      finalUsername = `${username}_${counter}`
      counter++
    }

    // 使用默认密码
    const password = body.password || "Test1234"
    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name: finalUsername,
        email: email.toLowerCase(),
        password: hashedPassword,
      },
    })

    return NextResponse.json(
      {
        message: "注册成功",
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("注册错误:", error)
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 })
  }
}
