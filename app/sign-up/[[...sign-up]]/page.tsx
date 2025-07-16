"use client"

import { SignUp } from "@clerk/nextjs"
import { useMounted } from "@/hooks/use-mounted"

export default function SignUpPage() {
  const mounted = useMounted()

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignUp
        afterSignUpUrl="/"
        signInUrl="/sign-in"
        appearance={{
          elements: { card: "shadow-xl" },
        }}
      />
    </div>
  )
}
