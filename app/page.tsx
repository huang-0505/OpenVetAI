"use client"

import { useState } from "react"
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs"
import { Upload, Files, BarChart3, Shield, Settings, Database, Bell, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function HomePage() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState("upload")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Database className="h-12 w-12 text-blue-500" />
              </div>
              <CardTitle className="text-2xl text-white">Data Ingestion Portal</CardTitle>
              <CardDescription className="text-slate-400">
                Sign in to access your data processing dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <SignInButton mode="modal">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Sign In to Continue</Button>
              </SignInButton>
            </CardContent>
          </Card>
        </div>
      </SignedOut>

      <SignedIn>
        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Database className="h-8 w-8 text-blue-500" />
                <h1 className="text-2xl font-bold text-white">Data Ingestion Portal</h1>
                <Badge variant="outline" className="border-green-500 text-green-400">
                  Online
                </Badge>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Bell className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <HelpCircle className="h-5 w-5" />
                </Button>
                <div className="flex items-center space-x-2 text-sm text-slate-300">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Connected</span>
                </div>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-10 w-10",
                      userButtonPopoverCard: "bg-slate-800 border-slate-700",
                      userButtonPopoverActionButton: "text-slate-200 hover:bg-slate-700",
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="upload" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Files className="h-4 w-4 mr-2" />
                Files
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="quality" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Shield className="h-4 w-4 mr-2" />
                Quality
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* File Upload Section */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Upload className="h-5 w-5 mr-2 text-blue-500" />
                      File Upload
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Upload your data files for processing and analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center bg-gradient-to-br from-slate-800/30 to-slate-700/30 hover:from-slate-700/40 hover:to-slate-600/40 transition-all duration-300 cursor-pointer">
                      <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-slate-300 mb-2">Click to upload or drag and drop</p>
                      <p className="text-sm text-slate-500">
                        Supports CSV, Excel, JSON, XML, and Text files up to 100MB
                      </p>
                      <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">Choose Files</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-green-500" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 p-4 rounded-lg border border-blue-500/20 text-center">
                        <div className="text-2xl font-bold text-blue-400">156</div>
                        <div className="text-sm text-slate-400">Total Files</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 p-4 rounded-lg border border-green-500/20 text-center">
                        <div className="text-2xl font-bold text-green-400">142</div>
                        <div className="text-sm text-slate-400">Processed</div>
                      </div>
                      <div className="bg-gradient-to-br from-red-600/20 to-red-500/10 p-4 rounded-lg border border-red-500/20 text-center">
                        <div className="text-2xl font-bold text-red-400">8</div>
                        <div className="text-sm text-slate-400">Failed</div>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 text-center">
                        <div className="text-2xl font-bold text-yellow-400">6</div>
                        <div className="text-sm text-slate-400">Queued</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Database Connection */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center">
                      <Database className="h-5 w-5 mr-2 text-blue-500" />
                      Database Connection
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Supabase database connection status and statistics
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                      Connected
                    </Badge>
                    <Badge variant="outline" className="border-green-500 text-green-400">
                      Online
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 p-4 rounded-lg border border-blue-500/20 text-center">
                      <div className="text-2xl font-bold text-blue-400">1</div>
                      <div className="text-sm text-slate-400">Total Records</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 p-4 rounded-lg border border-green-500/20 text-center">
                      <div className="text-2xl font-bold text-green-400">1</div>
                      <div className="text-sm text-slate-400">Approved</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 text-center">
                      <div className="text-2xl font-bold text-yellow-400">0</div>
                      <div className="text-sm text-slate-400">Ready</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-600/20 to-red-500/10 p-4 rounded-lg border border-red-500/20 text-center">
                      <div className="text-2xl font-bold text-red-400">0</div>
                      <div className="text-sm text-slate-400">Rejected</div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">File Management</CardTitle>
                  <CardDescription className="text-slate-400">View and manage your uploaded files</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Files className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">No files uploaded yet</p>
                    <p className="text-sm text-slate-500 mt-2">Upload files in the Upload tab to see them here</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Analytics Dashboard</CardTitle>
                  <CardDescription className="text-slate-400">Data processing and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <BarChart3 className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">Analytics dashboard coming soon...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quality" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Data Quality</CardTitle>
                  <CardDescription className="text-slate-400">Monitor and improve data quality metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Shield className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">Quality metrics dashboard coming soon...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Settings</CardTitle>
                  <CardDescription className="text-slate-400">
                    Configure your data ingestion preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-medium">Auto-processing</h3>
                        <p className="text-sm text-slate-400">Automatically process uploaded files</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                      >
                        Enable
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-medium">Email notifications</h3>
                        <p className="text-sm text-slate-400">Get notified when processing completes</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                      >
                        Configure
                      </Button>
                    </div>
                    {user?.emailAddresses[0]?.emailAddress === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                      <div className="border-t border-slate-700 pt-6">
                        <h3 className="text-white font-medium mb-4 flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-yellow-500" />
                          Admin Settings
                        </h3>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 mr-2 hover:bg-slate-700 bg-transparent"
                          >
                            User Management
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                          >
                            System Configuration
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </SignedIn>
    </div>
  )
}
