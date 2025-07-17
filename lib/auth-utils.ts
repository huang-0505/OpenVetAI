"use client"

import { useUser } from "@clerk/nextjs"

export function useUserRole() {
  const { user } = useUser()

  // Check if user is admin based on email or metadata
  const isAdmin =
    user?.emailAddresses?.[0]?.emailAddress === process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
    user?.publicMetadata?.role === "admin"

  return {
    isAdmin,
    role: isAdmin ? "admin" : "user",
  }
}

export function checkAdminAccess(user: any): boolean {
  return (
    user?.emailAddresses?.[0]?.emailAddress === process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
    user?.publicMetadata?.role === "admin"
  )
}
