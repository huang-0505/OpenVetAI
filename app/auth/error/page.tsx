"use client"

import { AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"

export default function AuthErrorPage() {
  // NextAuth puts the error type in ?error=XYZ
  const params = useSearchParams()
  const error = params.get("error") ?? "Unknown"

  // Human-readable messages (extend as needed)
  const messages: Record<string, string> = {
    OAuthSignin: "OAuth sign-in failed.",
    OAuthCallback: "OAuth callback failed.",
    OAuthCreateAccount: "Could not create OAuth account.",
    EmailSignin: "E-mail sign-in is disabled.",
    CredentialsSignin: "Invalid credentials.",
    AccessDenied: "Access denied.",
    Configuration: "Server mis-configuration.",
    Verification: "The sign-in link is no longer valid.",
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500" />
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>{messages[error] ?? "An unknown error occurred."}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Button asChild variant="default">
            <Link href="/auth/signin">Try signing in again</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
