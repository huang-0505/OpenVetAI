import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ClerkProvider } from "@clerk/nextjs"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Data Ingestion Portal",
  description: "A comprehensive data ingestion and processing platform",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the publishable key, but don't fail if it's missing
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {publishableKey ? (
            <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>
          ) : (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Required</h1>
                <p className="text-gray-600 mb-4">Please add your Clerk Publishable Key to continue.</p>
                <div className="bg-gray-100 p-4 rounded text-left">
                  <p className="text-sm font-mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key_here</p>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Get your key from{" "}
                  <a
                    href="https://dashboard.clerk.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Clerk Dashboard
                  </a>
                </p>
              </div>
            </div>
          )}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
