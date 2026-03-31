import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/prisma"
import { registerSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      const error = parsed.error.errors[0]
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { username, email, password } = parsed.data

    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (existingEmail) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 400 })
    }

    const existingUsername = await prisma.user.findFirst({
      where: { name: username },
    })
    if (existingUsername) {
      return NextResponse.json({ error: "该用户名已被使用" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name: username,
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
