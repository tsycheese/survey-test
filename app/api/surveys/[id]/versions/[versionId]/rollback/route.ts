import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/surveys/[id]/versions/[versionId]/rollback - 回滚到指定版本
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, versionId } = await params

    // 检查权限（只有创建者可以回滚）
    const survey = await prisma.survey.findUnique({
      where: { id },
    })

    if (!survey) {
      return Response.json({ error: "Survey not found" }, { status: 404 })
    }

    if (survey.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    // 获取要回滚的版本
    const version = await prisma.surveyVersion.findUnique({
      where: { id: versionId },
    })

    if (!version || version.surveyId !== id) {
      return Response.json({ error: "Version not found" }, { status: 404 })
    }

    // 更新问卷的当前版本
    await prisma.survey.update({
      where: { id },
      data: {
        currentVersionId: version.id,
      },
    })

    return Response.json({
      success: true,
      version: {
        ...version,
        isCurrent: true,
      },
    })
  } catch (error) {
    console.error("Rollback version error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
