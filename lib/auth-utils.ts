"use client"

import { useUser, type User } from "@clerk/nextjs"

/* ----------  SERVER / SHARED ---------- */
export function isAdmin(user: User | null): boolean {
  if (!user) return false
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  return user.emailAddresses.some((e) => e.emailAddress === adminEmail)
}

/* ----------  CLIENT HOOK --------------- */
export function useUserRole() {
  const { user, isLoaded } = useUser()

  // While Clerk is loading we expose sensible fall-backs
  if (!isLoaded) {
    return {
      isLoaded: false,
      isAdmin: false,
      role: "guest" as const,
      user: null as User | null,
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
