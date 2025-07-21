"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs"
import {
  Upload,
  Files,
  BarChart3,
  Shield,
  Settings,
  Database,
  Bell,
  HelpCircle,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
  Check,
  XCircle,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { processWithAI } from "@/lib/ai-processing"
import { supabase } from "@/lib/supabase"

interface UploadedFile {
  id: string
  file: File
  status: "uploading" | "processing" | "completed" | "error"
  progress: number
  processedData?: any
  error?: string
}

export default function HomePage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("upload")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [dbFiles, setDbFiles] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if user is admin
  const isAdmin = user?.emailAddresses[0]?.emailAddress === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  // Fetch files from database
  const fetchDbFiles = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("processed_data")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase error:", error)
        toast({
          title: "Database Error",
          description: "Could not connect to database. Using local storage only.",
          variant: "destructive",
        })
        return
      }
      setDbFiles(data || [])
    } catch (error) {
      console.error("Error fetching files:", error)
      toast({
        title: "Connection Error",
        description: "Database connection failed. Files will be processed locally only.",
        variant: "destructive",
      })
    }
  }, [user, toast])

  useEffect(() => {
    if (user) {
      fetchDbFiles()
    }
  }, [user, fetchDbFiles])

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        status: "uploading" as const,
        progress: 0,
      }))

      setUploadedFiles((prev) => [...prev, ...newFiles])

      for (const uploadedFile of newFiles) {
        try {
          // Simulate upload progress
          for (let progress = 0; progress <= 100; progress += 20) {
            await new Promise((resolve) => setTimeout(resolve, 200))
            setUploadedFiles((prev) => prev.map((f) => (f.id === uploadedFile.id ? { ...f, progress } : f)))
          }

          // Update status to processing
          setUploadedFiles((prev) => prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: "processing" } : f)))

          // Read file content
          const content = await readFileContent(uploadedFile.file)

          // Process with AI (this is currently a simulation)
          const processedData = await processWithAI(content, uploadedFile.file.name)

          // Try to save to database, but continue even if it fails
          let dbRecord = null
          try {
            const { data, error } = await supabase
              .from("processed_data")
              .insert({
                name: uploadedFile.file.name,
                type: detectFileType(uploadedFile.file.name),
                source: "upload",
                original_content: content.substring(0, 10000), // Limit content size
                processed_content: JSON.stringify(processedData),
                extracted_data: processedData,
                labels: ["veterinary", "research"],
                status: isAdmin ? "ready" : "pending",
                user_id: user?.id || "anonymous",
                uploaded_by: user?.emailAddresses[0]?.emailAddress || "anonymous",
              })
              .select()

            if (error) {
              console.warn("Database save failed:", error)
              toast({
                title: "Database Warning",
                description: "File processed but not saved to database. Check your connection.",
                variant: "destructive",
              })
            } else {
              dbRecord = data?.[0]
              fetchDbFiles() // Refresh database files
            }
          } catch (dbError) {
            console.warn("Database operation failed:", dbError)
          }

          // Update status to completed
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id
                ? {
                    ...f,
                    status: "completed",
                    processedData: dbRecord || processedData,
                  }
                : f,
            ),
          )

          toast({
            title: "File processed successfully",
            description: isAdmin
              ? `${uploadedFile.file.name} has been processed and is ready.`
              : `${uploadedFile.file.name} has been uploaded and is pending admin approval.`,
          })
        } catch (error) {
          console.error("Error processing file:", error)
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id
                ? {
                    ...f,
                    status: "error",
                    error: error instanceof Error ? error.message : "Processing failed",
                  }
                : f,
            ),
          )

          toast({
            title: "Error processing file",
            description: `Failed to process ${uploadedFile.file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
            variant: "destructive",
          })
        }
      }
    },
    [user?.id, user?.emailAddresses, isAdmin, fetchDbFiles, toast],
  )

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === "string") {
          resolve(result)
        } else {
          reject(new Error("Failed to read file as text"))
        }
      }
      reader.onerror = () => reject(new Error("File reading failed"))
      reader.readAsText(file)
    })
  }

  const detectFileType = (filename: string): string => {
    const ext = filename.toLowerCase().split(".").pop()
    switch (ext) {
      case "pdf":
        return "research-paper"
      case "doc":
      case "docx":
        return "clinical-study"
      case "txt":
        return "case-report"
      case "csv":
      case "xlsx":
        return "veterinary-journal"
      default:
        return "other"
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFileUpload(files)
      }
    },
    [handleFileUpload],
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFileUpload(files)
      }
    },
    [handleFileUpload],
  )

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }, [])

  const approveFile = useCallback(
    async (fileId: string) => {
      if (!isAdmin) return

      try {
        const { error } = await supabase.from("processed_data").update({ status: "approved" }).eq("id", fileId)

        if (error) throw error

        fetchDbFiles()
        toast({
          title: "File approved",
          description: "File has been approved and is now available.",
        })
      } catch (error) {
        toast({
          title: "Error approving file",
          description: "Failed to approve the file.",
          variant: "destructive",
        })
      }
    },
    [isAdmin, fetchDbFiles, toast],
  )

  const rejectFile = useCallback(
    async (fileId: string) => {
      if (!isAdmin) return

      try {
        const { error } = await supabase.from("processed_data").update({ status: "rejected" }).eq("id", fileId)

        if (error) throw error

        fetchDbFiles()
        toast({
          title: "File rejected",
          description: "File has been rejected.",
        })
      } catch (error) {
        toast({
          title: "Error rejecting file",
          description: "Failed to reject the file.",
          variant: "destructive",
        })
      }
    },
    [isAdmin, fetchDbFiles, toast],
  )

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
      case "processing":
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getDbStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-500/20 text-red-400">
            Rejected
          </Badge>
        )
      case "ready":
        return (
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
            Ready
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

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
                {isAdmin && (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    Admin
                  </Badge>
                )}
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
          {/* AI Processing Notice */}
          <div className="mb-6">
            <Card className="bg-blue-900/20 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <p className="text-blue-300 text-sm">
                    <strong>AI Processing:</strong> Currently using simulated AI processing for demonstration. Files are
                    analyzed with mock data. To integrate real AI, connect to OpenAI, Google Cloud AI, or other AI
                    services.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

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
                      {isAdmin
                        ? "Upload your data files for processing and analysis"
                        : "Upload files for admin review and approval"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`upload-zone border-2 border-dashed rounded-lg p-8 text-center bg-gradient-to-br from-slate-800/30 to-slate-700/30 transition-all duration-300 cursor-pointer ${
                        isDragOver
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/20"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-slate-300 mb-2">
                        {isDragOver ? "Drop files here" : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-sm text-slate-500">
                        Supports CSV, Excel, JSON, XML, and Text files up to 100MB
                      </p>
                      {!isAdmin && <p className="text-xs text-yellow-400 mt-2">Files will be pending admin approval</p>}
                      <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">Choose Files</Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".csv,.xlsx,.json,.xml,.txt,.pdf,.doc,.docx"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </div>

                    {/* Upload Progress */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <h4 className="text-white font-medium">Upload Progress</h4>
                        {uploadedFiles.map((file) => (
                          <div key={file.id} className="bg-slate-700/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                <span className="text-sm text-slate-300 truncate max-w-[200px]">{file.file.name}</span>
                                {getStatusIcon(file.status)}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(file.id)}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            {file.status === "uploading" && <Progress value={file.progress} className="h-2" />}
                            {file.status === "processing" && (
                              <div className="text-xs text-blue-400">Processing with AI (simulation)...</div>
                            )}
                            {file.status === "completed" && (
                              <div className="text-xs text-green-400">
                                ✓ {isAdmin ? "Processed successfully" : "Uploaded - pending approval"}
                              </div>
                            )}
                            {file.status === "error" && <div className="text-xs text-red-400">✗ {file.error}</div>}
                          </div>
                        ))}
                      </div>
                    )}
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
                        <div className="text-2xl font-bold text-blue-400">
                          {dbFiles.length + uploadedFiles.filter((f) => f.status === "completed").length}
                        </div>
                        <div className="text-sm text-slate-400">Total Files</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 p-4 rounded-lg border border-green-500/20 text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {dbFiles.filter((f) => f.status === "approved" || f.status === "ready").length}
                        </div>
                        <div className="text-sm text-slate-400">Approved</div>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                          {dbFiles.filter((f) => f.status === "pending").length +
                            uploadedFiles.filter((f) => f.status === "processing").length}
                        </div>
                        <div className="text-sm text-slate-400">Pending</div>
                      </div>
                      <div className="bg-gradient-to-br from-red-600/20 to-red-500/10 p-4 rounded-lg border border-red-500/20 text-center">
                        <div className="text-2xl font-bold text-red-400">
                          {dbFiles.filter((f) => f.status === "rejected").length +
                            uploadedFiles.filter((f) => f.status === "error").length}
                        </div>
                        <div className="text-sm text-slate-400">Rejected/Failed</div>
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
                      <div className="text-2xl font-bold text-blue-400">{dbFiles.length}</div>
                      <div className="text-sm text-slate-400">DB Records</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 p-4 rounded-lg border border-green-500/20 text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {dbFiles.filter((f) => f.status === "approved" || f.status === "ready").length}
                      </div>
                      <div className="text-sm text-slate-400">Approved</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {dbFiles.filter((f) => f.status === "pending").length}
                      </div>
                      <div className="text-sm text-slate-400">Pending</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-600/20 to-red-500/10 p-4 rounded-lg border border-red-500/20 text-center">
                      <div className="text-2xl font-bold text-red-400">
                        {dbFiles.filter((f) => f.status === "rejected").length}
                      </div>
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
                  <CardDescription className="text-slate-400">
                    {isAdmin ? "View and manage all uploaded files" : "View your uploaded files"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dbFiles.length > 0 || uploadedFiles.filter((f) => f.status === "completed").length > 0 ? (
                    <div className="space-y-4">
                      {/* Show database files */}
                      {dbFiles
                        .filter((file) => isAdmin || file.user_id === user?.id)
                        .map((file) => (
                          <div key={file.id} className="bg-slate-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-blue-400" />
                                <div>
                                  <h4 className="text-white font-medium">{file.name}</h4>
                                  <p className="text-sm text-slate-400">
                                    Uploaded by: {file.uploaded_by} • {new Date(file.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getDbStatusBadge(file.status)}

                                {/* Admin-only actions */}
                                {isAdmin && (
                                  <div className="flex space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300"
                                      title="Preview"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {file.status === "pending" && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => approveFile(file.id)}
                                          className="h-8 w-8 p-0 text-green-400 hover:text-green-300"
                                          title="Approve"
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => rejectFile(file.id)}
                                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                                          title="Reject"
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                )}

                                {/* Regular users see restricted message */}
                                {!isAdmin && file.status === "pending" && (
                                  <div className="flex items-center space-x-1 text-xs text-slate-500">
                                    <Lock className="h-3 w-3" />
                                    <span>Awaiting approval</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                      {/* Show completed uploaded files that aren't in database yet */}
                      {uploadedFiles
                        .filter((f) => f.status === "completed")
                        .map((file) => (
                          <div key={file.id} className="bg-slate-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-green-400" />
                                <div>
                                  <h4 className="text-white font-medium">{file.file.name}</h4>
                                  <p className="text-sm text-slate-400">
                                    Just uploaded • {(file.file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                                Processed
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Files className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400">No files uploaded yet</p>
                      <p className="text-sm text-slate-500 mt-2">Upload files in the Upload tab to see them here</p>
                    </div>
                  )}
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
                  {isAdmin ? (
                    <div className="text-center py-12">
                      <BarChart3 className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400">Analytics dashboard coming soon...</p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Lock className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400">Analytics access restricted to administrators</p>
                    </div>
                  )}
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
                  {isAdmin ? (
                    <div className="text-center py-12">
                      <Shield className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400">Quality metrics dashboard coming soon...</p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Lock className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400">Quality metrics access restricted to administrators</p>
                    </div>
                  )}
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
                        disabled={!isAdmin}
                      >
                        {isAdmin ? "Enable" : "Admin Only"}
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
                    {isAdmin && (
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
