import { Images } from "lucide-react"
import { nanoid } from "nanoid"
import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import type {
  QuestionDef,
  ImageMultipleChoiceQuestion,
  ImageOption,
} from "@/lib/questions/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PlusCircle, Trash2, Upload, X, Check } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { QuestionTitle } from "@/components/questions/question-title"
import { Textarea } from "@/components/ui/textarea"
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  type CloudinaryUploadResult,
} from "@/lib/cloudinary"
import { toast } from "sonner"

// 预设的图片比例选项
const ASPECT_RATIOS = [
  { value: "3:4", label: "3:4", width: 3, height: 4 },
  { value: "4:3", label: "4:3", width: 4, height: 3 },
  { value: "1:1", label: "1:1", width: 1, height: 1 },
  { value: "16:9", label: "16:9", width: 16, height: 9 },
  { value: "9:16", label: "9:16", width: 9, height: 16 },
]

function getAspectRatioClass(ratio: string): string {
  switch (ratio) {
    case "1:1":
      return "aspect-square"
    case "16:9":
      return "aspect-video"
    case "4:3":
      return "aspect-[4/3]"
    case "9:16":
      return "aspect-[9/16]"
    case "3:4":
    default:
      return "aspect-[3/4]"
  }
}

function ImageOptionCard({
  option,
  aspectRatio,
  showTitles,
  showLabels,
  isSelected,
  onToggleSelect,
  onEditTitle,
  onEditLabel,
  onDelete,
  onImageUpload,
  onImageRemove,
  isEditable = false,
}: {
  option: ImageOption
  aspectRatio: string
  showTitles: boolean
  showLabels: boolean
  isSelected: boolean
  onToggleSelect?: () => void
  onEditTitle: (title: string) => void
  onEditLabel: (label: string) => void
  onDelete: () => void
  onImageUpload: (result: CloudinaryUploadResult) => void
  onImageRemove: () => void
  isEditable?: boolean
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState(option.title || "")
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [label, setLabel] = useState(option.label || "")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTitleBlur = () => {
    setIsEditingTitle(false)
    onEditTitle(title)
  }

  const handleLabelBlur = () => {
    setIsEditingLabel(false)
    onEditLabel(label)
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件")
      return
    }

    setIsUploading(true)
    const result = await uploadToCloudinary(file)

    if ("error" in result) {
      toast.error(result.error)
    } else {
      // 直接传递上传结果，避免重复上传
      onImageUpload(result)
      toast.success("图片上传成功")
    }
    setIsUploading(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card transition-all duration-200",
        isSelected && "border-primary shadow-md ring-1 ring-primary",
        !isSelected && "hover:shadow-sm"
      )}
    >
      {/* 图片区域 */}
      <div
        className={cn("relative bg-muted", getAspectRatioClass(aspectRatio))}
      >
        {option.imageUrl ? (
          <>
            <img
              src={option.imageUrl}
              alt={option.title || option.label || "选项图片"}
              className="h-full w-full object-cover"
            />
            {/* 选择状态标识 */}
            {isSelected && onToggleSelect && (
              <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            {/* 删除图片按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onImageRemove()
              }}
              className="text-destructive-foreground absolute top-1 right-8 rounded-full bg-destructive/90 p-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleImageClick()
            }}
            className="flex h-full w-full flex-col items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <Upload className="mb-2 h-8 w-8" />
            <span className="text-xs">点击上传图片</span>
          </button>
        )}

        {/* 上传中遮罩 */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="text-sm text-muted-foreground">上传中...</span>
          </div>
        )}

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* 内容区域：title + label */}
      <div className="space-y-2 border-t p-3">
        {/* Title - 居中显示 */}
        {showTitles && (
          <div>
            {isEditingTitle ? (
              <Textarea
                autoFocus
                className="min-h-[40px] w-full resize-none border-0 bg-transparent p-2 text-center text-sm font-medium outline-none focus-visible:ring-0"
                rows={1}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleTitleBlur()
                  }
                }}
                placeholder="添加标题"
              />
            ) : (
              <div
                onClick={() => isEditable && setIsEditingTitle(true)}
                className={cn(
                  "cursor-text py-2 text-center text-sm font-medium text-foreground",
                  !isEditable && "pointer-events-none"
                )}
              >
                {option.title || "添加标题..."}
              </div>
            )}
          </div>
        )}

        {/* Label - 可选显示 */}
        {showLabels && (
          <div>
            {isEditingLabel ? (
              <Textarea
                autoFocus
                className="min-h-[44px] w-full resize-none border-0 bg-transparent p-2 text-center text-sm outline-none focus-visible:ring-0"
                rows={2}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleLabelBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleLabelBlur()
                  }
                }}
                placeholder="添加选项说明（可选）"
              />
            ) : (
              <div
                onClick={() => isEditable && setIsEditingLabel(true)}
                className={cn(
                  "flex min-h-[44px] cursor-text items-center justify-center py-2 text-center text-sm text-muted-foreground",
                  isEditable && "cursor-text",
                  !isEditable && "pointer-events-none"
                )}
              >
                {option.label || "添加说明..."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 点击选择区域（仅非编辑模式） */}
      {!isEditable && onToggleSelect && (
        <div
          onClick={onToggleSelect}
          className="absolute inset-0 cursor-pointer"
        />
      )}
    </div>
  )
}

function QuestionCard({
  question,
  order,
  showNumber = true,
  onUpdate,
  onTitleChange,
  onTitleBlur,
  onDescriptionChange,
  onDescriptionBlur,
  onOptionChange,
}: {
  question: ImageMultipleChoiceQuestion
  order: number
  showNumber?: boolean
  onUpdate?: (question: ImageMultipleChoiceQuestion) => void
  onTitleChange?: (title: string) => void
  onTitleBlur?: (title: string) => void
  onDescriptionChange?: (description: string) => void
  onDescriptionBlur?: (description: string) => void
  onOptionChange?: (question: ImageMultipleChoiceQuestion) => void
}) {
  const {
    options,
    columns = 2,
    showLabels = true,
    showTitles = true,
    aspectRatio = "3:4",
  } = question.config
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])

  const handleOptionToggle = (optionId: string) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    )
  }

  return (
    <div className="relative px-3 py-3">
      <div className="absolute -top-2 left-6 z-10 rounded-t-none rounded-b bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
        多选题
      </div>

      <QuestionTitle
        order={order}
        showNumber={showNumber}
        title={question.title}
        description={question.description}
        required={question.required}
        onChange={onTitleChange}
        onBlur={onTitleBlur}
        onDescriptionChange={onDescriptionChange}
        onDescriptionBlur={onDescriptionBlur}
      />

      <div className="relative mt-4">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {options.map((opt) => (
            <div key={opt.id}>
              <ImageOptionCard
                option={opt}
                aspectRatio={aspectRatio}
                showTitles={showTitles}
                showLabels={showLabels}
                isSelected={selectedOptionIds.includes(opt.id)}
                onToggleSelect={() => handleOptionToggle(opt.id)}
                isEditable={true}
                onEditTitle={(title) => {
                  const updatedOptions = options.map((o) =>
                    o.id === opt.id ? { ...o, title } : o
                  )
                  const updatedQuestion = {
                    ...question,
                    config: {
                      ...question.config,
                      options: updatedOptions,
                    },
                  }
                  if (onUpdate) {
                    onUpdate(updatedQuestion)
                  } else if (onOptionChange) {
                    onOptionChange(updatedQuestion)
                  }
                }}
                onEditLabel={(label) => {
                  const updatedOptions = options.map((o) =>
                    o.id === opt.id ? { ...o, label } : o
                  )
                  const updatedQuestion = {
                    ...question,
                    config: {
                      ...question.config,
                      options: updatedOptions,
                    },
                  }
                  if (onUpdate) {
                    onUpdate(updatedQuestion)
                  } else if (onOptionChange) {
                    onOptionChange(updatedQuestion)
                  }
                }}
                onDelete={() => {
                  const updatedOptions = options.filter((o) => o.id !== opt.id)
                  const updatedQuestion = {
                    ...question,
                    config: {
                      ...question.config,
                      options: updatedOptions,
                    },
                  }
                  if (onUpdate) {
                    onUpdate(updatedQuestion)
                  } else if (onOptionChange) {
                    onOptionChange(updatedQuestion)
                  }
                }}
                onImageUpload={(result) => {
                  const updatedOptions = options.map((o) =>
                    o.id === opt.id
                      ? {
                          ...o,
                          imageUrl: result.url,
                          publicId: result.publicId,
                          width: result.width,
                          height: result.height,
                        }
                      : o
                  )
                  const updatedQuestion = {
                    ...question,
                    config: {
                      ...question.config,
                      options: updatedOptions,
                    },
                  }
                  if (onUpdate) {
                    onUpdate(updatedQuestion)
                  } else if (onOptionChange) {
                    onOptionChange(updatedQuestion)
                  }
                }}
                onImageRemove={async () => {
                  // 删除 Cloudinary 上的图片
                  if (opt.publicId) {
                    const result = await deleteFromCloudinary(opt.publicId)
                    if ("error" in result) {
                      toast.error(result.error)
                    }
                  }
                  // 只清空图片数据，保留选项
                  const updatedOptions = options.map((o) =>
                    o.id === opt.id
                      ? {
                          ...o,
                          imageUrl: "",
                          publicId: "",
                          width: 0,
                          height: 0,
                        }
                      : o
                  )
                  const updatedQuestion = {
                    ...question,
                    config: {
                      ...question.config,
                      options: updatedOptions,
                    },
                  }
                  if (onUpdate) {
                    onUpdate(updatedQuestion)
                  } else if (onOptionChange) {
                    onOptionChange(updatedQuestion)
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const imageMultipleChoiceDef: QuestionDef<ImageMultipleChoiceQuestion> =
  {
    type: "IMAGE_MULTIPLE_CHOICE",
    category: "choice",
    label: "图片多选",
    icon: Images,
    defaultQuestion: (order) => ({
      id: nanoid(),
      type: "IMAGE_MULTIPLE_CHOICE",
      title: "图片多选题",
      required: false,
      order,
      config: {
        options: [
          { id: nanoid(), imageUrl: "", title: "", label: "" },
          { id: nanoid(), imageUrl: "", title: "", label: "" },
          { id: nanoid(), imageUrl: "", title: "", label: "" },
          { id: nanoid(), imageUrl: "", title: "", label: "" },
        ],
        columns: 4,
        showLabels: true,
        showTitles: true,
        aspectRatio: "3:4",
      },
    }),
    Canvas: ({ question, onUpdate }) => {
      const {
        options,
        columns = 2,
        showTitles = true,
        showLabels = true,
        aspectRatio = "3:4",
      } = question.config
      const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])

      const handleOptionToggle = (optionId: string) => {
        setSelectedOptionIds((prev) =>
          prev.includes(optionId)
            ? prev.filter((id) => id !== optionId)
            : [...prev, optionId]
        )
      }

      return (
        <div className="relative">
          <div className="absolute -top-2.5 left-0 z-10 rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            多选题
          </div>
          <div
            className="grid gap-4 pt-4"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {options.map((opt) => (
              <div key={opt.id}>
                <ImageOptionCard
                  option={opt}
                  aspectRatio={aspectRatio}
                  showTitles={showTitles}
                  showLabels={showLabels}
                  isSelected={selectedOptionIds.includes(opt.id)}
                  onToggleSelect={() => handleOptionToggle(opt.id)}
                  onEditTitle={(title) => {
                    if (!onUpdate) return
                    const updatedOptions = options.map((o) =>
                      o.id === opt.id ? { ...o, title } : o
                    )
                    onUpdate({
                      ...question,
                      config: {
                        ...question.config,
                        options: updatedOptions,
                      },
                    })
                  }}
                  onEditLabel={(label) => {
                    if (!onUpdate) return
                    const updatedOptions = options.map((o) =>
                      o.id === opt.id ? { ...o, label } : o
                    )
                    onUpdate({
                      ...question,
                      config: {
                        ...question.config,
                        options: updatedOptions,
                      },
                    })
                  }}
                  onDelete={() => {}}
                  onImageUpload={(result) => {
                    if (!onUpdate) return
                    const updatedOptions = options.map((o) =>
                      o.id === opt.id
                        ? {
                            ...o,
                            imageUrl: result.url,
                            publicId: result.publicId,
                            width: result.width,
                            height: result.height,
                          }
                        : o
                    )
                    onUpdate({
                      ...question,
                      config: {
                        ...question.config,
                        options: updatedOptions,
                      },
                    })
                  }}
                  onImageRemove={async () => {
                    // 删除 Cloudinary 上的图片
                    if (opt.publicId) {
                      const result = await deleteFromCloudinary(opt.publicId)
                      if ("error" in result) {
                        console.error(result.error)
                      }
                    }
                    // 只清空图片数据，保留选项
                  }}
                  isEditable={false}
                />
              </div>
            ))}
          </div>
        </div>
      )
    },
    Editor: ({ question, onChange, onSave }) => {
      const {
        options,
        columns = 2,
        showLabels = true,
        showTitles = true,
        aspectRatio = "3:4",
      } = question.config

      function updateOptionTitle(id: string, title: string) {
        onChange({
          ...question,
          config: {
            ...question.config,
            options: question.config.options.map((o) =>
              o.id === id ? { ...o, title } : o
            ),
          },
        })
      }

      function updateOptionLabel(id: string, label: string) {
        onChange({
          ...question,
          config: {
            ...question.config,
            options: question.config.options.map((o) =>
              o.id === id ? { ...o, label } : o
            ),
          },
        })
      }

      function addOption() {
        onSave?.({
          ...question,
          config: {
            ...question.config,
            options: [
              ...question.config.options,
              { id: nanoid(), imageUrl: "", title: "", label: "" },
            ],
          },
        })
      }

      function removeOption(id: string) {
        if (options.length <= 2) return
        onChange({
          ...question,
          config: {
            ...question.config,
            options: question.config.options.filter((o) => o.id !== id),
          },
        })
      }

      function handleImageUpload(
        optionId: string,
        result: CloudinaryUploadResult
      ): void {
        onSave?.({
          ...question,
          config: {
            ...question.config,
            options: question.config.options.map((o) =>
              o.id === optionId
                ? {
                    ...o,
                    imageUrl: result.url,
                    publicId: result.publicId,
                    width: result.width,
                    height: result.height,
                  }
                : o
            ),
          },
        })
      }

      return (
        <div className="space-y-4">
          {/* 布局配置 */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                每行选项数
              </Label>
              <Select
                value={columns.toString()}
                onValueChange={(value) => {
                  const updated = {
                    ...question,
                    config: { ...question.config, columns: parseInt(value) },
                  }
                  onChange(updated)
                  onSave?.(updated)
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} 列
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">图片比例</Label>
              <Select
                value={aspectRatio}
                onValueChange={(value) => {
                  const updated = {
                    ...question,
                    config: { ...question.config, aspectRatio: value },
                  }
                  onChange(updated)
                  onSave?.(updated)
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">显示标题</Label>
              <Switch
                checked={showTitles}
                onCheckedChange={(v) => {
                  const updated = {
                    ...question,
                    config: { ...question.config, showTitles: v },
                  }
                  onChange(updated)
                  onSave?.(updated)
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                显示选项标签
              </Label>
              <Switch
                checked={showLabels}
                onCheckedChange={(v) => {
                  const updated = {
                    ...question,
                    config: { ...question.config, showLabels: v },
                  }
                  onChange(updated)
                  onSave?.(updated)
                }}
              />
            </div>
          </div>

          {/* 选项列表 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">选项内容</Label>
              {options.map((opt, index) => (
                <div
                  key={opt.id}
                  className="flex items-start gap-2 border-b border-dashed border-border pb-3 last:pb-0"
                >
                  {/* 图片预览缩略图 */}
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted">
                    {opt.imageUrl ? (
                      <img
                        src={opt.imageUrl}
                        alt={opt.title || opt.label || `选项${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Images className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    {/* Title 输入 */}
                    <Textarea
                      value={opt.title || ""}
                      onChange={(e) =>
                        updateOptionTitle(opt.id, e.target.value)
                      }
                      onBlur={() => {
                        const updated = {
                          ...question,
                          config: {
                            ...question.config,
                            options: [...question.config.options],
                          },
                        }
                        onSave?.(updated)
                      }}
                      className="min-h-[32px] resize-none border-b border-dashed border-border bg-transparent px-0 text-sm font-medium outline-none focus-visible:ring-0 dark:bg-transparent"
                      rows={1}
                      placeholder="标题"
                    />
                    {/* Label 输入 */}
                    <Textarea
                      value={opt.label || ""}
                      onChange={(e) =>
                        updateOptionLabel(opt.id, e.target.value)
                      }
                      onBlur={() => {
                        const updated = {
                          ...question,
                          config: {
                            ...question.config,
                            options: [...question.config.options],
                          },
                        }
                        onSave?.(updated)
                      }}
                      className="min-h-[40px] resize-none border-none bg-transparent px-0 text-sm text-muted-foreground outline-none focus-visible:ring-0 dark:bg-transparent"
                      rows={1}
                      placeholder="说明"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeOption(opt.id)}
                    disabled={options.length <= 2}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full"
              >
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                添加选项
              </Button>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium">使用说明：</p>
            <ul className="list-inside list-disc space-y-1">
              <li>点击选项卡片上传图片</li>
              <li>至少需要 2 个选项</li>
              <li>标题居中显示，说明文字可选</li>
              <li>答题时可多选</li>
            </ul>
          </div>
        </div>
      )
    },
    QuestionCard,
  }
