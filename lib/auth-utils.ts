"use client"

import { useUser, type User } from "@clerk/nextjs"

export function isAdmin(user: User | null): boolean {
  if (!user) return false

  // Check if user email matches admin email from environment
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (adminEmail && user.emailAddresses.some((email) => email.emailAddress === adminEmail)) {
    return true
  }

  // Check if user has admin role in public metadata
  const publicMetadata = user.publicMetadata as { role?: string }
  return publicMetadata?.role === "admin"
}

export function useUserRole() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return {
      isLoaded: false,
      isAdmin: false,
      role: "guest" as const,
      user: null,
    }
  }

  const admin = isAdmin(user)
  return {
    isLoaded: true,
    isAdmin: admin,
    role: admin ? ("admin" as const) : ("user" as const),
    user,
  }
}
