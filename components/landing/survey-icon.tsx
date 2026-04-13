"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function SurveyIcon({ className }: { className?: string }) {
  const [drawProgress, setDrawProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDrawProgress(100)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <svg
      viewBox="0 0 120 120"
      className={cn("h-24 w-24", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 外框 - 圆角矩形 */}
      <rect
        x="10"
        y="10"
        width="100"
        height="100"
        rx="16"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="400"
        strokeDashoffset={400 - (400 * drawProgress) / 100}
        className="transition-all duration-1000 ease-out"
        fill="none"
      />

      {/* 标题线条 */}
      <line
        x1="25"
        y1="30"
        x2="95"
        y2="30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="70"
        strokeDashoffset={70 - (70 * drawProgress) / 100}
        className="transition-all duration-1000 ease-out"
        style={{ transitionDelay: "200ms" }}
      />
      <line
        x1="25"
        y1="40"
        x2="75"
        y2="40"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="50"
        strokeDashoffset={50 - (50 * drawProgress) / 100}
        className="transition-all duration-1000 ease-out"
        style={{ transitionDelay: "300ms" }}
      />

      {/* 选项圆形 */}
      <circle
        cx="30"
        cy="58"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="38"
        strokeDashoffset={38 - (38 * drawProgress) / 100}
        className="transition-all duration-1000 ease-out"
        style={{ transitionDelay: "400ms" }}
        fill="none"
      />
      <line
        x1="45"
        y1="58"
        x2="95"
        y2="58"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="50"
        strokeDashoffset={50 - (50 * drawProgress) / 100}
        className="transition-all duration-1000 ease-out"
        style={{ transitionDelay: "500ms" }}
      />

      <circle
        cx="30"
        cy="76"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="38"
        strokeDashoffset={38 - (38 * drawProgress) / 100}
        className="transition-all duration-1000 ease-out"
        style={{ transitionDelay: "600ms" }}
        fill="none"
      />
      <line
        x1="45"
        y1="76"
        x2="95"
        y2="76"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="50"
        strokeDashoffset={50 - (50 * drawProgress) / 100}
        className="transition-all duration-1000 ease-out"
        style={{ transitionDelay: "700ms" }}
      />

      <circle
        cx="30"
        cy="94"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="38"
        strokeDashoffset={38 - (38 * drawProgress) / 100}
        className="transition-all duration-1000 ease-out"
        style={{ transitionDelay: "800ms" }}
        fill="none"
      />
      <line
        x1="45"
        y1="94"
        x2="95"
        y2="94"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="50"
        strokeDashoffset={50 - (50 * drawProgress) / 100}
        className="transition-all duration-1000 ease-out"
        style={{ transitionDelay: "900ms" }}
      />

      {/* 对勾标记 - 最后出现 */}
      <path
        d="M26 92 L30 96 L36 88"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="20"
        strokeDashoffset={20 - (20 * drawProgress) / 100}
        className="transition-all duration-1000 ease-out"
        style={{ transitionDelay: "1000ms" }}
        fill="none"
      />
    </svg>
  )
}
