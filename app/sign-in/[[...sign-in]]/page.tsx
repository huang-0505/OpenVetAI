"use client"

import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </main>
  )
}
