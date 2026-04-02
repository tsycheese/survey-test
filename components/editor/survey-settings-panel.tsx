import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { SurveySettings } from "@/lib/questions/types"

interface SurveySettingsPanelProps {
  settings?: SurveySettings
  onUpdateSettings: (settings: SurveySettings) => void
}

export function SurveySettingsPanel({
  settings,
  onUpdateSettings,
}: SurveySettingsPanelProps) {
  const showQuestionNumber = settings?.showQuestionNumber ?? true

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-medium">显示设置</h3>
        <div className="mt-3 flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">显示题目编号</Label>
          <Switch
            checked={showQuestionNumber}
            onCheckedChange={(v) => onUpdateSettings({ showQuestionNumber: v })}
          />
        </div>
      </div>
    </div>
  )
}
