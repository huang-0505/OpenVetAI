/**
 * Centralised NextAuth route (App Router)
 * – Returns **JSON** for every error so the browser never receives an HTML 500 page,
 *   eliminating “CLIENT_FETCH_ERROR”.
 * – Gracefully reports missing env-vars instead of crashing during import time.
 */
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const { NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env

function missingVars(): string[] {
  const missing: string[] = []
  if (!NEXTAUTH_SECRET) missing.push("NEXTAUTH_SECRET")
  if (!GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID")
  if (!GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET")
  return missing
}

function buildAuthOptions() {
  return {
    secret: NEXTAUTH_SECRET,
    session: { strategy: "jwt" },
    providers: [
      GoogleProvider({
        clientId: GOOGLE_CLIENT_ID ?? "",
        clientSecret: GOOGLE_CLIENT_SECRET ?? "",
      }),
    ],
    pages: { signIn: "/auth/signin", error: "/auth/error" }, // keep API & UI in sync
  } as const
}

const handler = NextAuth(buildAuthOptions())

async function wrapped(request: Request) {
  // If required env-vars are missing, bail out with JSON (avoids HTML error page).
  const missing = missingVars()
  if (missing.length) {
    return Response.json(
      {
        error: "Server configuration error",
        missingEnv: missing,
        docs: "https://next-auth.js.org/configuration/options#secret",
      },
      { status: 500 },
    )
  }

  // Delegate to NextAuth’s handler (GET or POST).
  return handler(request)
}

// Re-export for both HTTP verbs
export const GET = wrapped
export const POST = wrapped
