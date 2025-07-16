import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { ClerkProvider } from "@clerk/nextjs"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Data Ingestion Portal",
  description: "Upload and process your data files",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  // Show setup instructions if key is missing
  if (!publishableKey) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
              <h1 className="text-2xl font-bold text-red-600 mb-4">🔑 Clerk Setup Required</h1>
              <div className="space-y-4 text-gray-700">
                <p>To use this application, you need to set up Clerk authentication:</p>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Step 1: Create a Clerk account</h3>
                  <p>
                    Go to{" "}
                    <a href="https://clerk.com" className="text-blue-600 underline" target="_blank" rel="noreferrer">
                      https://clerk.com
                    </a>{" "}
                    and sign up
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Step 2: Create an application</h3>
                  <p>In the Clerk dashboard, click "Add application" and give it a name</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Step 3: Get your publishable key</h3>
                  <p>
                    In your Clerk dashboard, go to "API Keys" and copy the publishable key (starts with{" "}
                    <code className="bg-gray-200 px-1 rounded">pk_test_</code>)
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Step 4: Add environment variable</h3>
                  <p>Add this to your environment variables:</p>
                  <code className="block bg-gray-800 text-green-400 p-2 rounded mt-2">
                    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
                  </code>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <p className="text-blue-800">
                    <strong>Note:</strong> After adding the environment variable, restart your development server with{" "}
                    <code className="bg-blue-100 px-1 rounded">npm run dev</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider publishableKey={publishableKey}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
