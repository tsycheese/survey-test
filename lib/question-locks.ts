import "server-only"

const DEFAULT_QUESTION_LOCK_LEASE_MS = 60_000
const MIN_QUESTION_LOCK_LEASE_MS = 2_000
const MAX_QUESTION_LOCK_LEASE_MS = 10 * 60_000

function getQuestionLockLeaseMs(): number {
  const configured = Number(process.env.QUESTION_LOCK_LEASE_MS)
  if (!Number.isFinite(configured)) return DEFAULT_QUESTION_LOCK_LEASE_MS
  return Math.min(
    MAX_QUESTION_LOCK_LEASE_MS,
    Math.max(MIN_QUESTION_LOCK_LEASE_MS, Math.trunc(configured))
  )
}

export const QUESTION_LOCK_LEASE_MS = getQuestionLockLeaseMs()

export type QuestionLockRecord = {
  id: string
  lockedBy: string | null
  lockedAt: Date | null
  lockClientId: string | null
  lockId: string | null
  lockExpiresAt: Date | null
}

export function isQuestionLockActive(
  lock: Omit<QuestionLockRecord, "id">,
  now: Date
): lock is Omit<QuestionLockRecord, "id"> & {
  lockedBy: string
  lockedAt: Date
  lockClientId: string
  lockId: string
  lockExpiresAt: Date
} {
  return Boolean(
    lock.lockedBy &&
    lock.lockedAt &&
    lock.lockClientId &&
    lock.lockId &&
    lock.lockExpiresAt &&
    lock.lockExpiresAt.getTime() > now.getTime()
  )
}

export function getQuestionLockExpiry(now: Date): Date {
  return new Date(now.getTime() + QUESTION_LOCK_LEASE_MS)
}

export function serializeQuestionLock(
  lock: QuestionLockRecord,
  userName: string | null,
  now: Date
) {
  if (!isQuestionLockActive(lock, now)) return null

  return {
    questionId: lock.id,
    userId: lock.lockedBy,
    userName,
    lockedAt: lock.lockedAt.toISOString(),
    lockClientId: lock.lockClientId,
    lockId: lock.lockId,
    lockExpiresAt: lock.lockExpiresAt.toISOString(),
    leaseRemainingMs: Math.max(0, lock.lockExpiresAt.getTime() - now.getTime()),
  }
}

export const clearedQuestionLock = {
  lockedBy: null,
  lockedAt: null,
  lockClientId: null,
  lockId: null,
  lockExpiresAt: null,
} as const
