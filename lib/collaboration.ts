import { prisma } from "@/prisma"

export type SurveyPermission = "edit" | "viewResults"

export interface CollaborationInfo {
  isOwner: boolean
  isCollaborator: boolean
  canEdit: boolean
  canViewResults: boolean
}

/**
 * 检查用户对问卷的协作权限
 */
export async function checkSurveyPermission(
  surveyId: string,
  userId: string
): Promise<CollaborationInfo> {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      collaborators: {
        where: { userId },
      },
    },
  })

  if (!survey) {
    return {
      isOwner: false,
      isCollaborator: false,
      canEdit: false,
      canViewResults: false,
    }
  }

  const isOwner = survey.userId === userId
  const collaborator = survey.collaborators[0]
  const isCollaborator = !!collaborator

  return {
    isOwner,
    isCollaborator,
    canEdit: isOwner || collaborator?.canEdit || false,
    canViewResults: isOwner || collaborator?.canViewResults || false,
  }
}

/**
 * 记录操作日志
 */
export async function logSurveyAction(
  surveyId: string,
  userId: string,
  action: string,
  details?: Record<string, unknown>
) {
  await prisma.surveyLog.create({
    data: {
      surveyId,
      userId,
      action,
      details: (details || {}) as never,
    },
  })
}
