"use client"

import type { User } from "@clerk/nextjs/server"
import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"

export function isAdmin(user: User): boolean {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  return user.emailAddresses[0]?.emailAddress === adminEmail
}

export function useUserRole() {
  const { user, isLoaded } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (isLoaded && user) {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      setIsAdmin(user.emailAddresses[0]?.emailAddress === adminEmail)
    }
  }, [user, isLoaded])

  return { isAdmin, isLoaded }
}
