"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, Key, Shield } from "lucide-react"

export default function SettingsPage() {
  const [googleClientId, setGoogleClientId] = useState("")
  const [googleClientSecret, setGoogleClientSecret] = useState("")
  const [nextAuthSecret, setNextAuthSecret] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load existing settings from localStorage
    const savedClientId = localStorage.getItem("google_client_id") || ""
    const savedClientSecret = localStorage.getItem("google_client_secret") || ""
    const savedAuthSecret = localStorage.getItem("nextauth_secret") || ""

    setGoogleClientId(savedClientId)
    setGoogleClientSecret(savedClientSecret)
    setNextAuthSecret(savedAuthSecret)
  }, [])

  const handleSave = async () => {
    // Save to localStorage
    localStorage.setItem("google_client_id", googleClientId)
    localStorage.setItem("google_client_secret", googleClientSecret)
    localStorage.setItem("nextauth_secret", nextAuthSecret)

    // Also save to server via API
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleClientId,
          googleClientSecret,
          nextAuthSecret,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error("Failed to save settings:", error)
    }
  }

  const generateSecret = () => {
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    setNextAuthSecret(secret)
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Authentication Settings</h1>
        <p className="text-muted-foreground mt-2">Configure your Google OAuth credentials and NextAuth settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Google OAuth Configuration
          </CardTitle>
          <CardDescription>Set up Google Sign-In for your data ingestion portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="client-id">Google Client ID</Label>
            <Input
              id="client-id"
              type="text"
              placeholder="123456789-abcdef.apps.googleusercontent.com"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-secret">Google Client Secret</Label>
            <Input
              id="client-secret"
              type="password"
              placeholder="GOCSPX-..."
              value={googleClientSecret}
              onChange={(e) => setGoogleClientSecret(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextauth-secret" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              NextAuth Secret
            </Label>
            <div className="flex gap-2">
              <Input
                id="nextauth-secret"
                type="password"
                placeholder="Your secure random string"
                value={nextAuthSecret}
                onChange={(e) => setNextAuthSecret(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={generateSecret}>
                Generate
              </Button>
            </div>
          </div>

          {saved && (
            <Alert>
              <AlertDescription>
                Settings saved successfully! Restart your application to apply changes.
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Get Google OAuth Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">1. Go to Google Cloud Console</h4>
            <p className="text-sm text-muted-foreground">
              Visit{" "}
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                className="text-blue-600 hover:underline"
                rel="noreferrer"
              >
                console.cloud.google.com
              </a>{" "}
              and create or select a project
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">2. Enable Google+ API</h4>
            <p className="text-sm text-muted-foreground">
              Go to "APIs & Services" → "Library" and enable the Google+ API
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">3. Create OAuth Credentials</h4>
            <p className="text-sm text-muted-foreground">
              Go to "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth client ID"
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">4. Configure Redirect URI</h4>
            <p className="text-sm text-muted-foreground">
              Add: <code className="bg-muted px-1 rounded">http://localhost:3000/api/auth/callback/google</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
