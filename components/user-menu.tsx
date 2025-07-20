"use client"

import { useUser, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield } from "lucide-react"

export function UserMenu() {
  const { user } = useUser()

  const isAdmin = () => {
    if (!user) return false
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    return user.primaryEmailAddress?.emailAddress === adminEmail
  }

  return (
    <div className="flex items-center space-x-4">
      <SignedOut>
        <SignInButton>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
          >
            Sign In
          </Button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <div className="flex items-center space-x-3">
          {isAdmin() && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
                userButtonPopoverCard: "bg-slate-800 border-slate-700",
                userButtonPopoverActionButton: "text-slate-300 hover:bg-slate-700",
              },
            }}
          />
        </div>
      </SignedIn>
    </div>
  )
}
