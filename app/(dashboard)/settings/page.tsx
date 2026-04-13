import { ProfileForm } from "@/components/user/profile-form"
import { ChangePasswordForm } from "@/components/user/change-password-form"

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      <div>
        <h1 className="text-3xl font-bold">个人设置</h1>
        <p className="mt-1 text-muted-foreground">管理你的账户信息和个人偏好</p>
      </div>

      <div className="space-y-6">
        <ProfileForm />
        <ChangePasswordForm />
      </div>
    </div>
  )
}
