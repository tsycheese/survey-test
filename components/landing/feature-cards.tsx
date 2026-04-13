"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { FileText, Users, Zap } from "lucide-react"

const features = [
  {
    icon: FileText,
    title: "17 种题型",
    description: "单选、多选、评分、NPS 等丰富题型",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Users,
    title: "实时协作",
    description: "多人同时编辑，即时同步",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Zap,
    title: "免费开源",
    description: "完全免费，代码开源可定制",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
]

export function FeatureCards() {
  const [visible, setVisible] = useState([false, false, false])

  useEffect(() => {
    const timers = [
      setTimeout(() => setVisible([true, false, false]), 800),
      setTimeout(() => setVisible([true, true, false]), 1000),
      setTimeout(() => setVisible([true, true, true]), 1200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {features.map((feature, index) => (
        <div
          key={feature.title}
          className={cn(
            "group relative flex flex-col items-center rounded-2xl border bg-card/50 p-4 backdrop-blur-sm transition-all duration-700",
            "hover:-translate-y-1 hover:bg-card hover:shadow-lg hover:shadow-primary/5",
            visible[index]
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          )}
          style={{
            transitionDelay: visible[index] ? `${index * 200}ms` : "0ms",
          }}
        >
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
              feature.bg
            )}
          >
            <feature.icon className={cn("h-6 w-6", feature.color)} />
          </div>
          <h3 className="mt-3 font-semibold">{feature.title}</h3>
          <p className="text-center text-sm text-muted-foreground">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  )
}
