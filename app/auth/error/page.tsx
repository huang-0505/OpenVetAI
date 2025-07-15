"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "There was a problem signing in with your OAuth provider.",
  OAuthCallback: "There was a problem processing the OAuth callback.",
  OAuthCreateAccount: "Could not create your account with the OAuth provider.",
  EmailSignin: "Email sign-in is not enabled.",
  CredentialsSignin: "The credentials you provided are invalid.",
  AccessDenied: "You do not have permission to access this application.",
  Configuration: "There is a problem with the server configuration.",
  Verification: "The sign-in link is no longer valid. It may have expired.",
  Default: "An unexpected error occurred during authentication.",
}

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") || "Default"
  const message = ERROR_MESSAGES[error] || ERROR_MESSAGES.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-900">Authentication Error</CardTitle>
          <CardDescription className="text-red-700">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <Link href="/auth/signin">
              <Button className="w-full">Try Again</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full bg-transparent">
                Go Home
              </Button>
            </Link>
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <strong>Debug info:</strong> Error code: {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
