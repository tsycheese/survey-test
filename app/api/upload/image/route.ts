import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * 删除 Cloudinary 图片
 * DELETE /api/upload/image
 * Body: { publicId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { publicId } = body

    if (!publicId) {
      return NextResponse.json({ error: "缺少 publicId 参数" }, { status: 400 })
    }

    // 检查必要的环境变量
    if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY) {
      return NextResponse.json(
        { error: "服务器未配置 Cloudinary 凭证" },
        { status: 500 }
      )
    }

    // 删除图片
    const result = await cloudinary.uploader.destroy(publicId)

    if (result.result !== "ok" && result.result !== "not found") {
      return NextResponse.json({ error: "删除失败", result }, { status: 500 })
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Cloudinary 删除错误:", error)
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
