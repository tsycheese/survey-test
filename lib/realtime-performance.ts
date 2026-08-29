"use client"

import {
  REALTIME_CLIENT_ID_HEADER,
  REALTIME_REQUEST_ID_HEADER,
} from "@/lib/realtime-shared"

const MAX_PENDING_REQUESTS = 500
const REQUEST_TTL_MS = 5 * 60 * 1000

type PendingRealtimeRequest = {
  startedAt: number
  registeredAt: number
}

const pendingRealtimeRequests = new Map<string, PendingRealtimeRequest>()

function prunePendingRequests(now: number) {
  for (const [requestId, request] of pendingRealtimeRequests) {
    if (now - request.registeredAt > REQUEST_TTL_MS) {
      pendingRealtimeRequests.delete(requestId)
    }
  }

  while (pendingRealtimeRequests.size >= MAX_PENDING_REQUESTS) {
    const oldestRequestId = pendingRealtimeRequests.keys().next().value
    if (!oldestRequestId) break
    pendingRealtimeRequests.delete(oldestRequestId)
  }
}

export function getRealtimeRequestHeaders(
  clientId: string | null,
  requestId = crypto.randomUUID()
): Record<string, string> {
  const registeredAt = performance.now()
  prunePendingRequests(registeredAt)

  if (!pendingRealtimeRequests.has(requestId)) {
    pendingRealtimeRequests.set(requestId, {
      startedAt: registeredAt,
      registeredAt,
    })
  }

  return {
    "Content-Type": "application/json",
    [REALTIME_REQUEST_ID_HEADER]: requestId,
    ...(clientId ? { [REALTIME_CLIENT_ID_HEADER]: clientId } : {}),
  }
}

export function finishRealtimeRequest(
  requestId: string,
  receivedAt = performance.now()
): number | null {
  const request = pendingRealtimeRequests.get(requestId)
  if (!request) return null

  pendingRealtimeRequests.delete(requestId)
  return Math.max(0, receivedAt - request.startedAt)
}
