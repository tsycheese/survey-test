import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/surveys/[id]/versions/[versionId] - 获取特定版本详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, versionId } = await params

    // 检查权限
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        collaborators: {
          where: { userId: session.user.id },
          select: { canViewResults: true },
        },
      },
    })

    if (!survey) {
      return Response.json({ error: "Survey not found" }, { status: 404 })
    }

    const isOwner = survey.userId === session.user.id
    const isCollaborator = survey.collaborators.length > 0
    const canView =
      isOwner || isCollaborator || survey.collaborators[0]?.canViewResults

    if (!canView) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    // 获取版本详情
    const version = await prisma.surveyVersion.findUnique({
      where: { id: versionId },
      include: {
        _count: {
          select: { responses: true },
        },
      },
    })

    if (!version || version.surveyId !== id) {
      return Response.json({ error: "Version not found" }, { status: 404 })
    }

    return Response.json({
      version: {
        ...version,
        isCurrent: version.id === survey.currentVersionId,
      },
    })
  } catch (error) {
    console.error("Get version error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/surveys/[id]/versions/[versionId] - 删除版本（仅创建者）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, versionId } = await params

    // 检查权限（只有创建者可以删除）
    const survey = await prisma.survey.findUnique({
      where: { id },
    })

    if (!survey) {
      return Response.json({ error: "Survey not found" }, { status: 404 })
    }

    if (survey.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    // 不能删除当前发布的版本
    if (versionId === survey.currentVersionId) {
      return Response.json(
        { error: "Cannot delete current published version" },
        { status: 400 }
      )
    }

    // 删除版本
    await prisma.surveyVersion.delete({
      where: { id: versionId },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("Delete version error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
