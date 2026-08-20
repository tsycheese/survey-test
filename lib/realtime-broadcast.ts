import "server-only"

import { after } from "next/server"
import {
  COLLABORATION_EVENTS,
  getSurveyChannel,
  pusherServer,
  realtimeProvider,
} from "@/lib/pusher"

type CollaborationEvent =
  (typeof COLLABORATION_EVENTS)[keyof typeof COLLABORATION_EVENTS]

type ScheduleSurveyBroadcastOptions = {
  surveyId: string
  event: CollaborationEvent
  operation: string
  payload: Record<string, unknown>
  requestId?: string
}

/**
 * 在响应结束后发布协作事件。数据库是最终事实来源，发布失败时记录诊断信息，
 * 客户端刷新或重连后会从数据库恢复一致状态。
 */
export function scheduleSurveyBroadcast({
  surveyId,
  event,
  operation,
  payload,
  requestId = crypto.randomUUID(),
}: ScheduleSurveyBroadcastOptions): string {
  const eventPayload = {
    ...payload,
    requestId,
    timestamp: new Date().toISOString(),
  }

  after(async () => {
    const startedAt = performance.now()

    try {
      await pusherServer.trigger(
        getSurveyChannel(surveyId),
        event,
        eventPayload
      )
      console.info("[Realtime Broadcast Performance]", {
        requestId,
        provider: realtimeProvider,
        operation,
        event,
        duration: `${(performance.now() - startedAt).toFixed(1)}ms`,
      })
    } catch (error) {
      console.error("[Realtime Broadcast Error]", {
        requestId,
        provider: realtimeProvider,
        operation,
        event,
        error,
      })
    }
  })

  return requestId
}
