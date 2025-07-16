"use client"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { DataViewer } from "@/components/data-viewer"
import { DatabaseStatus } from "@/components/database-status"
import { DataQualityMetrics } from "@/components/data-quality-metrics"
import { UserMenu } from "@/components/user-menu"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Database, Settings, FileText, BarChart3, Users } from "lucide-react"
import { useUser } from "@clerk/nextjs" // Import useUser hook

async function Home() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Data Ingestion Portal</h1>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <DataQualityMetrics />
            </div>
            <div>
              <DatabaseStatus />
            </div>
          </div>

          <DataViewer />
        </div>
      </main>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}

function SignInPrompt() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome to Data Ingestion Portal</CardTitle>
          <CardDescription>Please sign in to continue</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/sign-in">
            <Button className="w-full">Sign In</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DataIngestionPortal() {
  const { user, isLoaded } = useUser() // Declare useUser hook

  // Show loading spinner while checking authentication
  if (!isLoaded) {
    return <LoadingSpinner />
  }

  // Show sign-in prompt if not authenticated
  if (!user) {
    return <SignInPrompt />
  }

  // Main portal content for authenticated users
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Data Ingestion Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.fullName || user.emailAddresses[0]?.emailAddress}
              </span>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Quality
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>File Upload</CardTitle>
                  <CardDescription>Upload CSV, JSON, or Excel files for processing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Button>Choose Files</Button>
                      <p className="mt-2 text-sm text-gray-500">or drag and drop files here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Uploads</CardTitle>
                  <CardDescription>Track your recent file uploads and processing status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">customer_data.csv</span>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Processed</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">sales_report.xlsx</span>
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Processing</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DatabaseStatus />
          </TabsContent>

          <TabsContent value="data">
            <DataViewer />
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Data Analytics</CardTitle>
                <CardDescription>Analyze your ingested data with charts and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Analytics dashboard coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality">
            <DataQualityMetrics />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Processing Settings</CardTitle>
                  <CardDescription>Configure how your data is processed and stored</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/settings">
                    <Button>Open Settings</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
