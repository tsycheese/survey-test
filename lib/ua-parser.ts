/**
 * 轻量级 User-Agent 解析器
 * 不引入 ua-parser-js 重型依赖，手写正则覆盖常见场景
 */

export type ParsedUA = {
  deviceType: "desktop" | "mobile" | "tablet"
  os: string
  browser: string
}

export function parseUA(userAgent: string): ParsedUA {
  const ua = userAgent.toLowerCase()

  // 设备类型
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop"
  if (/ipad|tablet|kindle|silk/.test(ua)) {
    deviceType = "tablet"
  } else if (/mobile|iphone|ipod|android.*mobile|windows phone/.test(ua)) {
    deviceType = "mobile"
  }

  // 操作系统
  let os = "Other"
  if (/windows nt 10/.test(ua)) os = "Windows 10/11"
  else if (/windows nt/.test(ua)) os = "Windows"
  else if (/macintosh|mac os x/.test(ua)) os = "macOS"
  else if (/iphone|ipad|ipod/.test(ua)) os = "iOS"
  else if (/android/.test(ua)) os = "Android"
  else if (/linux/.test(ua)) os = "Linux"

  // 浏览器
  let browser = "Other"
  if (/edg/.test(ua)) browser = "Edge"
  else if (/opr|opera/.test(ua)) browser = "Opera"
  else if (/firefox/.test(ua)) browser = "Firefox"
  else if (/safari/.test(ua) && !/chrome/.test(ua)) browser = "Safari"
  else if (/chrome/.test(ua)) browser = "Chrome"

  return { deviceType, os, browser }
}
