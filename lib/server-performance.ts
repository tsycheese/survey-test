import "server-only"

export type PerformanceTimings = Record<string, number>

export async function measurePerformance<T>(
  timings: PerformanceTimings,
  name: string,
  action: () => Promise<T>
): Promise<T> {
  const startedAt = performance.now()

  try {
    return await action()
  } finally {
    timings[name] = performance.now() - startedAt
  }
}

export function formatServerTiming(timings: PerformanceTimings): string {
  return Object.entries(timings)
    .map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`)
    .join(", ")
}

export function formatPerformanceTimings(
  timings: PerformanceTimings
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(timings).map(([name, duration]) => [
      name,
      `${duration.toFixed(1)}ms`,
    ])
  )
}
