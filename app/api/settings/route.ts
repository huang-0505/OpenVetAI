import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { googleClientId, googleClientSecret, nextAuthSecret } = await request.json()

    // In a real app, you'd save these to a secure database
    // For now, we'll just acknowledge the save
    console.log("Settings saved:", {
      googleClientId: googleClientId ? "***" : "empty",
      googleClientSecret: googleClientSecret ? "***" : "empty",
      nextAuthSecret: nextAuthSecret ? "***" : "empty",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving settings:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}

export async function GET() {
  // Return current settings (without secrets)
  return NextResponse.json({
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
  })
}
