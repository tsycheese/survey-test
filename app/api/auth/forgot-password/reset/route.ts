import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { passwordSchema } from "@/lib/validations/auth"

const resetSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  code: z.string().length(6, "验证码应为 6 位数字"),
  password: passwordSchema,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = resetSchema.safeParse(body)

    if (!parsed.success) {
      const error = parsed.error.errors[0]
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { email, code, password } = parsed.data
    const normalizedEmail = email.toLowerCase()

    // 查找有效的验证码记录
    const tokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        email: normalizedEmail,
        token: code,
        expires: { gt: new Date() },
      },
    })

    if (!tokenRecord) {
      return NextResponse.json({ error: "验证码无效或已过期" }, { status: 400 })
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(password, 12)

    // 更新密码
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    // 删除已使用的验证码
    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    })

    return NextResponse.json({ message: "密码重置成功" })
  } catch (error) {
    console.error("[ResetPassword] 重置密码错误:", error)
    return NextResponse.json({ error: "重置失败，请稍后重试" }, { status: 500 })
  }
}
