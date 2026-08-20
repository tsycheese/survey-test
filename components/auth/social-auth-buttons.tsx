"use client"

import { useEffect, useState } from "react"
import { getProviders, signIn } from "next-auth/react"
import { GitBranch, Globe2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type SocialProviderId = "google" | "github"
type ProviderMap = NonNullable<Awaited<ReturnType<typeof getProviders>>>

type SocialAuthButtonsProps = {
  callbackUrl?: string
}

export function SocialAuthButtons({
  callbackUrl = "/",
}: SocialAuthButtonsProps) {
  const [providers, setProviders] = useState<ProviderMap | null>(null)
  const [pendingProvider, setPendingProvider] =
    useState<SocialProviderId | null>(null)

  useEffect(() => {
    let cancelled = false

    getProviders()
      .then((availableProviders) => {
        if (!cancelled) {
          setProviders(availableProviders)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProviders(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const socialProviders = providers
    ? (Object.entries(providers).filter(
        ([id]) => id === "google" || id === "github"
      ) as [SocialProviderId, ProviderMap[string]][])
    : []

  if (providers === null || socialProviders.length === 0) {
    return null
  }

  async function handleSignIn(provider: SocialProviderId) {
    setPendingProvider(provider)
    await signIn(provider, { callbackUrl })
    setPendingProvider(null)
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>或使用以下方式</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {socialProviders.map(([id, provider]) => {
          const providerId = id as SocialProviderId
          const isPending = pendingProvider === providerId
          const Icon = providerId === "google" ? Globe2 : GitBranch

          return (
            <Button
              key={id}
              type="button"
              variant="outline"
              className="w-full"
              disabled={pendingProvider !== null}
              onClick={() => handleSignIn(providerId)}
            >
              {isPending ? <Loader2 className="animate-spin" /> : <Icon />}
              使用 {provider.name} 登录
            </Button>
          )
        })}
      </div>
    </div>
  )
}
