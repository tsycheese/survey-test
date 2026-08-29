export const PERFORMANCE_LOGS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_PERF_LOGS === "true"

export function logPerformance(...data: unknown[]): void {
  if (!PERFORMANCE_LOGS_ENABLED) return
  console.info(...data)
}
