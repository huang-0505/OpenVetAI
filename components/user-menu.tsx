"use client"

import { UserButton } from "@clerk/nextjs"

export function UserMenu() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-10 w-10",
          userButtonPopoverCard: "bg-slate-800 border-slate-700",
          userButtonPopoverActionButton: "text-slate-200 hover:bg-slate-700",
        },
      }}
    />
  )
}
