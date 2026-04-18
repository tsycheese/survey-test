/**
 * IP 地址解析地域信息
 * 使用 ip-api.com 免费 API（非商业用途，45 req/min 限制）
 */

export type GeoIPResult = {
  country: string | null
  province: string | null
  city: string | null
}

// 简单内存缓存：同一 IP 24h 内只查一次
const cache = new Map<string, { result: GeoIPResult; expiresAt: number }>()

function getCached(ip: string): GeoIPResult | null {
  const entry = cache.get(ip)
  if (entry && entry.expiresAt > Date.now()) {
    return entry.result
  }
  if (entry) cache.delete(ip)
  return null
}

function setCache(ip: string, result: GeoIPResult) {
  cache.set(ip, {
    result,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  })
}

export async function lookupIP(ip: string): Promise<GeoIPResult> {
  if (!ip || ip === "unknown") {
    return { country: null, province: null, city: null }
  }

  // 检查缓存
  const cached = getCached(ip)
  if (cached) return cached

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(
      `http://ip-api.com/json/${ip}?lang=zh-CN&fields=status,message,country,regionName,city`,
      { signal: controller.signal }
    )

    clearTimeout(timeout)

    if (!res.ok) {
      return { country: null, province: null, city: null }
    }

    const data = await res.json()

    if (data.status !== "success") {
      return { country: null, province: null, city: null }
    }

    const result: GeoIPResult = {
      country: data.country || null,
      province: data.regionName || null,
      city: data.city || null,
    }

    setCache(ip, result)
    return result
  } catch {
    return { country: null, province: null, city: null }
  }
}
