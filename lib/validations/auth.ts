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

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "用户名至少需要 3 个字符")
      .max(20, "用户名不能超过 20 个字符")
      .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
    email: z.string().email("请输入有效的邮箱地址"),
    password: passwordSchema,
    confirmPassword: z.string(),
    agreeTerms: z.boolean().refine((val) => val === true, "必须同意服务条款"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
