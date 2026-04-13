import { z } from "zod"

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(3, "用户名至少需要 3 个字符")
    .max(20, "用户名不能超过 20 个字符")
    .regex(
      /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/,
      "用户名只能包含字母、数字、下划线和中文"
    ),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, "密码至少需要 6 个字符"),
    newPassword: z
      .string()
      .min(8, "密码至少需要 8 个字符")
      .regex(/[A-Z]/, "密码必须包含至少一个大写字母")
      .regex(/[a-z]/, "密码必须包含至少一个小写字母")
      .regex(/[0-9]/, "密码必须包含至少一个数字"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "两次输入的新密码不一致",
    path: ["confirmNewPassword"],
  })

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
