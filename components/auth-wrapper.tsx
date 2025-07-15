"use client"

import { useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { type ReactNode, useEffect } from "react"

interface Props {
  requireAuth?: boolean
  children: ReactNode
}

export function AuthWrapper({ requireAuth = false, children }: Props) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === "unauthenticated") {
      // remember where the user wanted to go
      const callbackUrl = encodeURIComponent(pathname)
      router.replace(`/auth/signin?callbackUrl=${callbackUrl}`)
    }
  }, [requireAuth, status, pathname, router])

  if (requireAuth && status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
