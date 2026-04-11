import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/surveys/[id]/versions - 获取问卷的所有版本
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

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

    // 获取所有版本
    const versions = await prisma.surveyVersion.findMany({
      where: { surveyId: id },
      orderBy: { version: "desc" },
      include: {
        _count: {
          select: { responses: true },
        },
      },
    })

    // 标记当前版本
    const versionsWithCurrent = versions.map(
      (v: {
        id: string
        version: number
        title: string
        description: string | null
        questions: unknown
        publishedAt: Date
        createdAt: Date
        _count: { responses: number }
      }) => ({
        ...v,
        isCurrent: v.id === survey.currentVersionId,
      })
    )

    return Response.json({ versions: versionsWithCurrent })
  } catch (error) {
    console.error("Get versions error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/surveys/[id]/versions - 发布新版本
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // 检查权限（只有创建者可以发布）
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    })

    if (!survey) {
      return Response.json({ error: "Survey not found" }, { status: 404 })
    }

    if (survey.userId !== session.user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    if (survey.questions.length === 0) {
      return Response.json(
        { error: "Cannot publish survey without questions" },
        { status: 400 }
      )
    }

    // 获取最新版本号
    const latestVersion = await prisma.surveyVersion.findFirst({
      where: { surveyId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    })

    const newVersionNumber = (latestVersion?.version || 0) + 1

    // 创建新版本
    const version = await prisma.surveyVersion.create({
      data: {
        surveyId: id,
        version: newVersionNumber,
        title: survey.title,
        description: survey.description,
        questions: survey.questions.map(
          (q: {
            id: string
            type: string
            title: string
            description: string | null
            required: boolean
            order: number
            config: unknown
          }) => ({
            id: q.id,
            type: q.type,
            title: q.title,
            description: q.description,
            required: q.required,
            order: q.order,
            config: q.config,
          })
        ) as unknown as import("@/prisma/generated/prisma/client").Prisma.InputJsonValue,
      },
    })

    // 更新问卷的当前版本和发布状态
    await prisma.survey.update({
      where: { id },
      data: {
        published: true,
        currentVersionId: version.id,
      },
    })

    return Response.json({ version })
  } catch (error) {
    console.error("Create version error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
