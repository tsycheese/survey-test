import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少需要 6 个字符"),
})

export const passwordSchema = z
  .string()
  .min(8, "密码至少需要 8 个字符")
  .regex(/[A-Z]/, "密码必须包含至少一个大写字母")
  .regex(/[a-z]/, "密码必须包含至少一个小写字母")
  .regex(/[0-9]/, "密码必须包含至少一个数字")

export const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  agreeTerms: z.boolean().refine((val) => val === true, "必须同意服务条款"),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
