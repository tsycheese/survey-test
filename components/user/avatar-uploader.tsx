"use client"

import { useRef, useState, useCallback } from "react"
import { Camera, X, Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AvatarUploaderProps {
  currentAvatar?: string | null
  userName?: string | null
  onAvatarChange: (avatarUrl: string | null) => void
}

export function AvatarUploader({
  currentAvatar,
  userName,
  onAvatarChange,
}: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentAvatar || null
  )
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleFileSelect = useCallback(
    async (file: File) => {
      // 验证文件类型
      if (!file.type.startsWith("image/")) {
        toast.error("只能上传图片文件")
        return
      }

      // 验证文件大小（最大 5MB）
      if (file.size > 5 * 1024 * 1024) {
        toast.error("图片大小不能超过 5MB")
        return
      }

      // 创建本地预览
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
      setIsUploading(true)

      try {
        // 上传头像
        const formData = new FormData()
        formData.append("avatar", file)

        const res = await fetch("/api/user/avatar", {
          method: "POST",
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          toast.error(data.error || "上传失败")
          setPreviewUrl(currentAvatar || null)
          return
        }

        toast.success("头像上传成功")
        onAvatarChange(data.avatar)
      } catch (error) {
        console.error("上传错误:", error)
        toast.error("上传失败，请稍后重试")
        setPreviewUrl(currentAvatar || null)
      } finally {
        setIsUploading(false)
        URL.revokeObjectURL(objectUrl)
      }
    },
    [currentAvatar, onAvatarChange]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
      // 重置 input 值，允许重复选择同一文件
      e.target.value = ""
    },
    [handleFileSelect]
  )

  const handleDeleteAvatar = useCallback(async () => {
    setIsDeleting(true)
    try {
      const res = await fetch("/api/user/avatar", {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "删除失败")
        return
      }

      toast.success("头像删除成功")
      setPreviewUrl(null)
      onAvatarChange(null)
    } catch (error) {
      console.error("删除错误:", error)
      toast.error("删除失败，请稍后重试")
    } finally {
      setIsDeleting(false)
    }
  }, [onAvatarChange])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 头像预览区域 */}
      <div
        className={cn(
          "relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-muted transition-all",
          isUploading && "opacity-50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={userName || "头像"}
              className="h-full w-full object-cover"
            />
            {/* 上传遮罩 */}
            {!isUploading && !isDeleting && (
              <div className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                <Camera className="h-6 w-6 text-white" />
              </div>
            )}
            {/* 删除按钮 */}
            {!isUploading && !isDeleting && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteAvatar()
                }}
                className="text-destructive-foreground absolute -top-1 -right-1 rounded-full bg-destructive p-1 opacity-0 transition-opacity hover:opacity-100"
                type="button"
                title="删除头像"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <span className="text-2xl font-bold text-primary">
              {(userName || "U").charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* 上传中状态 */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}

        {/* 删除中状态 */}
        {isDeleting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}

        {/* 点击上传区域 */}
        {!isUploading && !isDeleting && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 cursor-pointer"
            title="点击上传头像"
          >
            <span className="sr-only">上传头像</span>
          </button>
        )}
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isDeleting}
        >
          <Upload className="mr-1 h-4 w-4" />
          {previewUrl ? "更换头像" : "上传头像"}
        </Button>
        {previewUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeleteAvatar}
            disabled={isUploading || isDeleting}
          >
            <X className="mr-1 h-4 w-4" />
            删除
          </Button>
        )}
      </div>

      {/* 提示信息 */}
      <p className="text-center text-xs text-muted-foreground">
        支持 JPG、PNG、GIF 格式，最大 5MB
        <br />
        建议尺寸：500x500 像素
      </p>
    </div>
  )
}
