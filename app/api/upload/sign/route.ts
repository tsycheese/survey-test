import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * 获取 Cloudinary 上传签名
 * POST /api/upload/sign
 * Body: { params: Record<string, string> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { params } = body

    if (!params) {
      return NextResponse.json({ error: "缺少签名参数" }, { status: 400 })
    }

    // 检查必要的环境变量
    if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY) {
      return NextResponse.json(
        { error: "服务器未配置 Cloudinary 凭证" },
        { status: 500 }
      )
    }

    // 生成签名
    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET
    )

    return NextResponse.json({
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    })
  } catch (error) {
    console.error("Cloudinary 签名错误:", error)
    return NextResponse.json({ error: "生成签名失败" }, { status: 500 })
  }
}
