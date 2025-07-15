"use client"

import { signIn, getSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Chrome } from "lucide-react"

export default function SignIn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    getSession()
      .then((session) => {
        if (session) {
          router.push("/")
        }
      })
      .catch(() => {
        // Ignore session fetch errors on sign-in page
      })
  }, [router])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")

    try {
      const result = await signIn("google", {
        callbackUrl: "/",
        redirect: false,
      })

      if (result?.error) {
        setError("Sign in failed. Please try again.")
      } else if (result?.url) {
        router.push(result.url)
      }
    } catch (err) {
      setError("Sign in failed. Please try again.")
      console.error("Sign in error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome to Data Ingestion Portal</CardTitle>
          <CardDescription>Sign in to access your document processing dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGoogleSignIn} disabled={loading} className="w-full bg-transparent" variant="outline">
            <Chrome className="mr-2 h-4 w-4" />
            {loading ? "Signing in..." : "Continue with Google"}
          </Button>

          {error && <div className="text-sm text-red-600 text-center">{error}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
