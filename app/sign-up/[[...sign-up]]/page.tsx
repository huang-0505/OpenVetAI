"use client"

import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </main>
  )
}
