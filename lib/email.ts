import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

export async function sendPasswordResetEmail(
  to: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "重置密码验证码",
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111; margin-bottom: 16px;">重置密码</h2>
          <p style="color: #555; line-height: 1.6;">您正在重置密码，验证码为：</p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #111;">${code}</span>
          </div>
          <p style="color: #888; font-size: 14px; line-height: 1.6;">
            验证码有效期为 15 分钟，请勿泄露给他人。如非本人操作，请忽略此邮件。
          </p>
        </div>
      `,
    })

    if (error) {
      console.error("[Resend] 发送邮件失败:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error("[Resend] 发送邮件异常:", err)
    return { success: false, error: "邮件发送失败" }
  }
}
