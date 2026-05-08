import { NextRequest, NextResponse } from "next/server"
import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"
import { loginSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      const error = parsed.error.errors[0]
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    })

    return NextResponse.json({ message: "登录成功" })
  } catch (error) {
    // NextAuth v5 beta 可能抛出普通 Error，需要同时检查
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 })
        default:
          return NextResponse.json(
            { error: "登录失败，请稍后重试" },
            { status: 401 }
          )
      }
    }

    // 处理 authorize 函数抛出的错误（普通 Error 实例）
    if (error instanceof Error) {
      const message = error.message
      if (message.includes("邮箱或密码") || message.includes("格式不正确")) {
        return NextResponse.json({ error: message }, { status: 401 })
      }
      console.error("登录错误:", error)
      return NextResponse.json(
        { error: "登录失败，请稍后重试" },
        { status: 500 }
      )
    }

    console.error("登录错误:", error)
    return NextResponse.json({ error: "登录失败，请稍后重试" }, { status: 500 })
  }
}
