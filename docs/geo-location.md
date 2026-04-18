# 地理位置追踪功能

## 功能概述

地理位置追踪功能会自动记录填写问卷和浏览问卷的用户的地理位置信息（国家、省份、城市），帮助您分析问卷的受众地理分布。

## 数据收集范围

| 字段 | 说明 | 示例 |
|------|------|------|
| 国家 (country) | 国家名称 | 中国 |
| 省份 (province) | 省级行政区 | 广东、北京 |
| 城市 (city) | 城市名称 | 深圳、上海 |

> **注意**：本功能仅记录到城市级别，不包含街道、GPS 坐标等精确位置信息，严格保护用户隐私。

## 数据来源

地理位置通过用户的 **IP 地址** 解析获得。系统使用 [ip-api.com](https://ip-api.com) 免费 API 进行 IP 到地理位置的转换。

### 数据准确性说明

- **公网 IP**：可正常解析地理位置，准确度较高
- **内网 IP**（如 `127.0.0.1`、`192.168.x.x`、`10.x.x.x`）：无法解析，地理位置显示为 `-`
- **VPN/代理用户**：显示的是 VPN 服务器所在位置，而非用户真实位置
- **移动网络用户**：可能显示运营商网关所在城市，与实际位置有偏差

## 查看地理位置数据

### 1. 概览页面 - 地域分布图

在问卷结果页的「概览」标签下，可以看到 **地域分布** 横向柱状图：

- 显示各省份的填写人数
- 按人数从高到低排列
- 鼠标悬停可查看具体数值

### 2. 详情页面 - 地理位置列

在「详情」标签的表格中，新增了两列：

- **省份**：用户所在的省份/直辖市
- **城市**：用户所在的城市

表格支持按地理位置搜索和筛选。

### 3. 数据导出

导出 CSV 文件时，地理位置数据会包含在以下列中：

- `国家`
- `省份`
- `城市`

## 技术实现

### 数据收集时机

地理位置信息在以下两个时机收集：

1. **问卷浏览时**：用户打开问卷分享链接时记录（24 小时内同一 IP 去重）
2. **问卷提交时**：用户提交问卷时记录

### IP 地址获取

系统按以下优先级获取用户 IP：

```
X-Forwarded-For 请求头 → 直接连接 IP
```

### 缓存机制

为提升性能并减少 API 调用，系统对 IP 解析结果进行了 **24 小时内存缓存**：

- 同一 IP 在 24 小时内多次访问，只调用一次地理 API
- 缓存存储在应用内存中，应用重启后清空

### 容错处理

- API 调用超时（3 秒）：自动跳过，不阻塞问卷提交
- API 返回错误：记录为 `-`，不影响用户体验
- 私有 IP 地址：直接跳过解析，节省 API 调用

## 生产环境注意事项

### HTTPS 混合内容问题

ip-api.com 免费版仅支持 **HTTP** 协议。在生产环境使用 **HTTPS** 时，浏览器会阻止 HTTP 请求（混合内容安全策略），导致地理位置功能失效。

**解决方案（三选一）：**

#### 方案 1：使用 HTTPS 代理（推荐）

在服务器端添加代理路由，前端通过同域 HTTPS 请求代理：

```typescript
// app/api/geoip/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const ip = request.nextUrl.searchParams.get("ip")
  if (!ip) return NextResponse.json({ error: "Missing IP" }, { status: 400 })

  const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, {
    headers: { "User-Agent": "YourApp/1.0" },
  })
  const data = await res.json()
  return NextResponse.json(data)
}
```

然后修改 `lib/geoip.ts` 中的 API 地址为 `/api/geoip?ip=${ip}`。

#### 方案 2：切换到 ipapi.co

[ipapi.co](https://ipapi.co) 支持 HTTPS，但有每月 30,000 次免费请求限制：

```typescript
// 修改 lib/geoip.ts
const response = await fetch(`https://ipapi.co/${ip}/json/`, {
  headers: { "User-Agent": "YourApp/1.0" },
})
```

返回字段映射：

| ip-api.com | ipapi.co |
|-----------|----------|
| country | country_name |
| regionName | region |
| city | city |

#### 方案 3：使用商业 IP 地理服务

如需更高准确率和稳定性，可考虑：

- [MaxMind GeoIP2](https://www.maxmind.com/en/geoip2-services-and-databases)（本地数据库，无需网络请求）
- [IPGeolocation](https://ipgeolocation.io/)
- [IPInfo](https://ipinfo.io/)

### 速率限制

ip-api.com 免费版限制 **45 次请求/分钟**。对于高流量场景，建议：

1. 使用本地数据库（如 MaxMind GeoLite2）
2. 增加缓存时间
3. 使用商业 API

## 本地开发测试

本地开发时（`localhost`），您的 IP 通常是内网地址（如 `127.0.0.1` 或 `192.168.x.x`），无法解析地理位置。

### 使用 ngrok 进行公网测试

1. 安装 ngrok：
   ```bash
   # macOS
   brew install ngrok

   # Windows (Chocolatey)
   choco install ngrok
   ```

2. 注册并配置 authtoken：
   ```bash
   ngrok config add-authtoken <your-token>
   ```

3. 启动 ngrok 隧道（Next.js 默认端口 3000）：
   ```bash
   ngrok http 3000
   ```

4. 获取公网 URL（如 `https://xxxx.ngrok-free.dev`）

5. 将问卷分享链接中的 `localhost:3000` 替换为 ngrok URL

6. 通过 ngrok 链接访问问卷，即可看到真实的地理位置数据

## 隐私合规

### 数据最小化

本功能仅收集国家、省份、城市三级信息，不包含：

- 精确 GPS 坐标
- 街道地址
- 邮政编码
- 个人身份信息

### 用户告知

建议在问卷页面添加隐私说明，例如：

> 我们仅收集您的城市级别位置信息，用于分析问卷受众分布，不会追踪您的精确位置。

### 数据存储

地理位置数据与问卷回答数据存储在同一数据库表中，遵循相同的数据保留和删除策略。

## 故障排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 所有地理位置显示 `-` | 本地开发使用内网 IP | 使用 ngrok 或部署到公网测试 |
| 生产环境无法获取位置 | HTTPS 混合内容被阻止 | 使用 HTTPS 代理或切换 API 服务商 |
| 位置信息不准确 | 用户使用了 VPN/代理 | 这是正常现象，显示的是出口 IP 位置 |
| API 请求频繁失败 | 超出速率限制 | 增加缓存时间或升级 API 套餐 |
| 特定地区显示错误 | IP 数据库更新延迟 | IP 地理数据库非实时更新，存在误差 |

## 配置参考

### 环境变量

本功能无需额外环境变量，但生产环境切换 API 时可能需要：

```env
# 可选：ipapi.co API Key（如需更高限额）
IPAPI_KEY=your_api_key

# 可选：MaxMind 许可证密钥
MAXMIND_LICENSE_KEY=your_license_key
```

### 相关文件

| 文件 | 说明 |
|------|------|
| `lib/geoip.ts` | IP 解析核心逻辑 |
| `app/api/s/[token]/submit/route.ts` | 提交时收集地理位置 |
| `app/api/s/[token]/view/route.ts` | 浏览时收集地理位置 |
| `app/api/surveys/[id]/responses/route.ts` | 统计数据聚合 API |
| `prisma/schema/survey.prisma` | 数据库 Schema（Response/SurveyView 表） |
| `app/(editor)/surveys/[id]/results/components/location-stats.tsx` | 地域分布图表组件 |
| `app/(editor)/surveys/[id]/results/components/details-tab.tsx` | 详情表格（含位置列） |
