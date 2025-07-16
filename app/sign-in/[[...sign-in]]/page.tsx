"use client"

import { SignIn } from "@clerk/nextjs"
import { useMounted } from "@/hooks/use-mounted"

export default function SignInPage() {
  const mounted = useMounted()

  if (!mounted) {
    // Avoid rendering Clerk (or *anything*) until after hydration.
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignIn
        signUpUrl="/sign-up"
        afterSignInUrl="/"
        appearance={{
          elements: { card: "shadow-xl" },
        }}
      />
    </div>
  )
}
