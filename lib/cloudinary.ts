/**
 * Cloudinary 图片上传工具函数
 */

export interface CloudinaryUploadResult {
  url: string
  publicId: string
  width: number
  height: number
  format: string
}

export interface CloudinaryUploadError {
  error: string
}

/**
 * 获取上传凭证
 */
async function getUploadCredentials(): Promise<{
  signature: string
  apiKey: string
  cloudName: string
  timestamp: string
} | null> {
  try {
    const timestamp = Math.round(Date.now() / 1000).toString()
    const params = {
      timestamp,
      folder: "survey-images",
    }

    const response = await fetch("/api/upload/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ params }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return {
      signature: data.signature,
      apiKey: data.apiKey,
      cloudName: data.cloudName,
      timestamp,
    }
  } catch (error) {
    console.error("获取上传凭证失败:", error)
    return null
  }
}

/**
 * 上传图片到 Cloudinary（使用签名方式）
 * @param file - 要上传的文件
 * @param folder - Cloudinary 文件夹路径（可选）
 * @returns 上传结果
 */
export async function uploadToCloudinary(
  file: File,
  folder = "survey-images"
): Promise<CloudinaryUploadResult | CloudinaryUploadError> {
  const credentials = await getUploadCredentials()

  if (!credentials) {
    return {
      error: "无法获取上传凭证",
    }
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("api_key", credentials.apiKey)
  formData.append("timestamp", credentials.timestamp)
  formData.append("signature", credentials.signature)
  formData.append("folder", folder)

  // 图片自动压缩和质量优化
  formData.append("quality", "auto")
  formData.append("fetch_format", "auto")

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      return {
        error: errorData.error?.message || "上传失败",
      }
    }

    const data = await response.json()

    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
    }
  } catch (error) {
    console.error("Cloudinary 上传错误:", error)
    return {
      error: error instanceof Error ? error.message : "上传失败",
    }
  }
}

/**
 * 生成 Cloudinary 图片 URL（带转换参数）
 * @param publicId - Cloudinary 公共资源 ID
 * @param options - 转换选项
 * @returns 优化后的图片 URL
 */
export function getCloudinaryUrl(
  publicId: string,
  options?: {
    width?: number
    height?: number
    quality?: string
    format?: string
  }
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) {
    return ""
  }

  const transformations: string[] = []

  if (options?.width) transformations.push(`w_${options.width}`)
  if (options?.height) transformations.push(`h_${options.height}`)
  if (options?.quality) transformations.push(`q_${options.quality}`)
  if (options?.format) transformations.push(`f_${options.format}`)

  // 默认优化设置
  if (!options?.quality && !options?.format) {
    transformations.push("q_auto", "f_auto")
  }

  const transformationStr =
    transformations.length > 0 ? transformations.join(",") + "/" : ""

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationStr}${publicId}`
}

/**
 * 计算图片宽高比
 */
export function getAspectRatio(width: number, height: number): string {
  if (!width || !height) return "1:1"

  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
  const divisor = gcd(width, height)

  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`
}

/**
 * 删除 Cloudinary 图片
 * @param publicId - Cloudinary 公共资源 ID
 * @returns 删除结果
 */
export async function deleteFromCloudinary(
  publicId: string
): Promise<{ success: boolean } | CloudinaryUploadError> {
  try {
    const response = await fetch("/api/upload/image", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        error: errorData.error || "删除失败",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Cloudinary 删除错误:", error)
    return {
      error: error instanceof Error ? error.message : "删除失败",
    }
  }
}
