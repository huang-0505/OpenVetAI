"use client"

import type React from "react"

import { useState } from "react"
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Upload,
  FileText,
  BarChart3,
  Shield,
  Settings,
  Database,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react"
import { UserMenu } from "@/components/user-menu"
import { DatabaseStatus } from "@/components/database-status"
import { DataViewer } from "@/components/data-viewer"
import { DataQualityMetrics } from "@/components/data-quality-metrics"
import { useMounted } from "@/hooks/use-mounted"

export default function DataIngestionPortalClient() {
  const { user, isLoaded } = useUser()
  const mounted = useMounted()
  const [activeTab, setActiveTab] = useState("upload")
  const [searchTerm, setSearchTerm] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  // Mock data for demonstration
  const [files] = useState([
    {
      id: 1,
      name: "customer_data.csv",
      size: "2.4 MB",
      status: "processed",
      uploadDate: "2024-01-15",
      records: 1250,
      quality: 95,
    },
    {
      id: 2,
      name: "sales_report.xlsx",
      size: "1.8 MB",
      status: "processing",
      uploadDate: "2024-01-15",
      records: 890,
      quality: 88,
    },
    {
      id: 3,
      name: "inventory.json",
      size: "856 KB",
      status: "failed",
      uploadDate: "2024-01-14",
      records: 0,
      quality: 0,
    },
  ])

  const stats = {
    totalFiles: 156,
    processed: 142,
    failed: 8,
    queued: 6,
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsUploading(true)
      setUploadProgress(0)

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setIsUploading(false)
            return 100
          }
          return prev + 10
        })
      }, 200)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      processed: "bg-green-500/20 text-green-400 border-green-500/30",
      processing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30",
      queued: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    }

    return (
      <Badge className={`${variants[status as keyof typeof variants]} border`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>

      <SignedIn>
        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Database className="h-8 w-8 text-blue-500" />
                  <h1 className="text-2xl font-bold text-white">Data Ingestion Portal</h1>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-300">Online</span>
                </div>
              </div>
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 bg-slate-800 border-slate-700">
              <TabsTrigger value="upload" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <FileText className="h-4 w-4 mr-2" />
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

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* File Upload */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Upload className="h-5 w-5 mr-2" />
                      File Upload
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      Upload your data files for processing and analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors bg-gradient-to-br from-slate-800/30 to-slate-700/30">
                      <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-300 mb-2">Click to upload or drag and drop</p>
                      <p className="text-sm text-slate-400 mb-4">
                        Supports CSV, Excel, JSON, XML, and Text files up to 100MB
                      </p>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                        accept=".csv,.xlsx,.json,.xml,.txt"
                      />
                      <label htmlFor="file-upload">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">Choose File</Button>
                      </label>
                      {isUploading && (
                        <div className="mt-4">
                          <Progress value={uploadProgress} className="w-full" />
                          <p className="text-sm text-slate-400 mt-2">Uploading... {uploadProgress}%</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-400">{stats.totalFiles}</div>
                        <div className="text-sm text-slate-300">Total Files</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">{stats.processed}</div>
                        <div className="text-sm text-slate-300">Processed</div>
                      </div>
                      <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
                        <div className="text-sm text-slate-300">Failed</div>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-400">{stats.queued}</div>
                        <div className="text-sm text-slate-300">Queued</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Database Connection */}
              <DatabaseStatus />
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">File Management</CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input
                          placeholder="Search files..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 bg-transparent">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Name</TableHead>
                        <TableHead className="text-slate-300">Size</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Upload Date</TableHead>
                        <TableHead className="text-slate-300">Records</TableHead>
                        <TableHead className="text-slate-300">Quality</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow key={file.id} className="border-slate-700">
                          <TableCell className="text-white font-medium">{file.name}</TableCell>
                          <TableCell className="text-slate-300">{file.size}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(file.status)}
                              {getStatusBadge(file.status)}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">{file.uploadDate}</TableCell>
                          <TableCell className="text-slate-300">{file.records.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-12 bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${file.quality}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-slate-300">{file.quality}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-400">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <DataViewer />
            </TabsContent>

            {/* Quality Tab */}
            <TabsContent value="quality">
              <DataQualityMetrics />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Application Settings</CardTitle>
                  <CardDescription className="text-slate-300">
                    Configure your data ingestion portal preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-slate-300">
                    <p>Settings panel coming soon...</p>
                    <p className="text-sm text-slate-400 mt-2">
                      Configure upload limits, processing options, and notification preferences.
                    </p>
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
