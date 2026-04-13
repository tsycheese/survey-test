import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/prisma"
import { v2 as cloudinary } from "cloudinary"

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * 上传头像
 * POST /api/user/avatar
 * FormData: { avatar: File }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const formData = await request.formData()
    const avatarFile = formData.get("avatar") as File

    if (!avatarFile) {
      return NextResponse.json({ error: "未提供头像文件" }, { status: 400 })
    }

    // 验证文件类型
    if (!avatarFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "只能上传图片文件" }, { status: 400 })
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024
    if (avatarFile.size > maxSize) {
      return NextResponse.json(
        { error: "图片大小不能超过 5MB" },
        { status: 400 }
      )
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const publicId = `avatars/${session.user.email}_${timestamp}`

    // 上传到 Cloudinary
    const arrayBuffer = await avatarFile.arrayBuffer()
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder: "survey-test/avatars",
          transformation: [
            { width: 500, height: 500, crop: "fill", gravity: "face" },
            { quality: "auto:good" },
            { fetch_format: "auto" },
          ],
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      stream.end(Buffer.from(arrayBuffer))
    })

    const uploadResult = result as {
      secure_url: string
      public_id: string
      width: number
      height: number
      format: string
    }

    // 更新用户头像
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { image: uploadResult.secure_url },
    })

    return NextResponse.json({
      message: "头像上传成功",
      avatar: uploadResult.secure_url,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
      },
    })
  } catch (error) {
    console.error("上传头像错误:", error)
    return NextResponse.json({ error: "上传失败，请稍后重试" }, { status: 500 })
  }
}

/**
 * 删除头像
 * DELETE /api/user/avatar
 */
export async function DELETE() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user?.image) {
      return NextResponse.json({ error: "没有头像可删除" }, { status: 404 })
    }

    // 从 Cloudinary 提取 public_id
    const urlParts = user.image.split("/")
    const publicIdWithExt = urlParts[urlParts.length - 1]
    const publicId = `survey-test/avatars/${publicIdWithExt.split(".")[0]}`

    // 从 Cloudinary 删除
    try {
      await cloudinary.uploader.destroy(publicId)
    } catch (e) {
      console.error("Cloudinary 删除失败:", e)
    }

    // 更新用户记录
    await prisma.user.update({
      where: { email: session.user.email },
      data: { image: null },
    })

    return NextResponse.json({ message: "头像删除成功" })
  } catch (error) {
    console.error("删除头像错误:", error)
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 500 })
  }
}
