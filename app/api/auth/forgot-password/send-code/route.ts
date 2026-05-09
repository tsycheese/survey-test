import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import { z } from "zod"

const sendCodeSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
})

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = sendCodeSchema.safeParse(body)

    if (!parsed.success) {
      const error = parsed.error.errors[0]
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { email } = parsed.data
    const normalizedEmail = email.toLowerCase()

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      // 出于安全考虑，不暴露邮箱是否存在
      return NextResponse.json(
        { message: "如果该邮箱已注册，验证码将发送至您的邮箱" },
        { status: 200 }
      )
    }

    // 清理该邮箱过期的验证码
    await prisma.passwordResetToken.deleteMany({
      where: {
        email: normalizedEmail,
        expires: { lt: new Date() },
      },
    })

    // 生成 6 位数字验证码
    const code = generateCode()
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 分钟有效

    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token: code,
        expires,
      },
    })

    // 发送邮件
    const result = await sendPasswordResetEmail(normalizedEmail, code)

    if (!result.success) {
      console.error("[ForgotPassword] 邮件发送失败:", result.error)
      return NextResponse.json(
        { error: "验证码发送失败，请稍后重试" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "验证码已发送至您的邮箱",
    })
  } catch (error) {
    console.error("[ForgotPassword] 发送验证码错误:", error)
    return NextResponse.json({ error: "发送失败，请稍后重试" }, { status: 500 })
  }
}
