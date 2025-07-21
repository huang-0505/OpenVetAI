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
  Lock,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
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
  // Tracks whether a file is being dragged over the upload drop-zone
  const [isDragOver, setIsDragOver] = useState(false)
  const [dbFiles, setDbFiles] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState<any>(null)
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
                status: "pending", // All files start as pending, even admin uploads
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
            description: `${uploadedFile.file.name} has been uploaded and is pending approval.`,
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
        setSelectedFile((prev: any) => (prev && prev.id === fileId ? { ...prev, status: "approved" } : prev))
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
        setSelectedFile((prev: any) => (prev && prev.id === fileId ? { ...prev, status: "rejected" } : prev))
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
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            Pending Approval
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30">
            Rejected
          </Badge>
        )
      case "ready":
        return (
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            Ready
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const pendingFiles = dbFiles.filter((f) => f.status === "pending")

  // Add test pending files for demo
  const addTestPendingFiles = useCallback(async () => {
    if (!isAdmin || !user) return

    try {
      const testFiles = [
        {
          name: "Anesthesia for Veterinary Technicians.pdf",
          type: "research-paper",
          source: "upload",
          original_content: `Contributors
Acknowledgements
1. Review of Cardiovascular and Respiratory Physiology
The Cardiovascular System
Respiratory Physiology
2. The Preanesthetic Workup
Physical Examination
Laboratory Tests
Risk Assessment
3. Anesthetic Equipment and Monitoring
Anesthetic Machines
Monitoring Equipment
Safety Protocols
4. Pharmacology of Anesthetic Agents
Inhalant Anesthetics
Injectable Anesthetics
Adjunctive Medications
5. Anesthetic Techniques
Induction Protocols
Maintenance Techniques
Recovery Procedures`,
          processed_content: JSON.stringify({
            title: "Medical Study: Anesthesia for Veterinary Technicians",
            summary:
              "This medical journal article presents research findings on clinical outcomes and treatment efficacy for veterinary anesthesia protocols and techniques.",
            keyPoints: [
              "Study methodology and patient demographics",
              "Primary and secondary endpoints",
              "Statistical analysis and results",
              "Clinical implications and recommendations",
            ],
            metadata: {
              studyType: "Clinical Trial",
              sampleSize: "N=245",
              duration: "12 months",
              primaryEndpoint: "Treatment efficacy",
            },
          }),
          extracted_data: {
            title: "Medical Study: Anesthesia for Veterinary Technicians",
            summary:
              "This medical journal article presents research findings on clinical outcomes and treatment efficacy for veterinary anesthesia protocols and techniques.",
            keyPoints: [
              "Study methodology and patient demographics",
              "Primary and secondary endpoints",
              "Statistical analysis and results",
              "Clinical implications and recommendations",
            ],
            metadata: {
              studyType: "Clinical Trial",
              sampleSize: "N=245",
              duration: "12 months",
              primaryEndpoint: "Treatment efficacy",
            },
          },
          labels: ["Medical Research", "Clinical Trial", "Nutrition", "Fitness", "Mental Health"],
          status: "pending",
          user_id: "test-user-id",
          uploaded_by: "researcher@veterinary.edu",
        },
        {
          name: "Veterinary Cardiology Case Studies.txt",
          type: "case-report",
          source: "upload",
          original_content: `Case Study 1: Dilated Cardiomyopathy in Golden Retriever
Patient: 8-year-old male Golden Retriever
Presenting complaint: Exercise intolerance, coughing
Diagnostic findings: Echocardiography revealed dilated left ventricle
Treatment protocol: ACE inhibitors, diuretics, dietary modification
Outcome: Significant improvement in clinical signs

Case Study 2: Mitral Valve Disease in Cavalier King Charles Spaniel
Patient: 12-year-old female CKCS
Presenting complaint: Heart murmur detected on routine examination
Diagnostic findings: Grade 4/6 systolic murmur, mitral regurgitation
Treatment protocol: Pimobendan, furosemide
Outcome: Stable condition with regular monitoring`,
          processed_content: JSON.stringify({
            title: "Veterinary Cardiology Case Studies",
            summary:
              "Collection of clinical case studies focusing on cardiac conditions in companion animals, including diagnostic approaches and treatment outcomes.",
            keyPoints: [
              "Dilated cardiomyopathy management in large breed dogs",
              "Mitral valve disease progression in small breeds",
              "Diagnostic imaging techniques in veterinary cardiology",
              "Evidence-based treatment protocols",
            ],
            metadata: {
              studyType: "Case Series",
              numberOfCases: "15 cases",
              duration: "24 months",
              primaryEndpoint: "Clinical improvement",
            },
          }),
          extracted_data: {
            title: "Veterinary Cardiology Case Studies",
            summary:
              "Collection of clinical case studies focusing on cardiac conditions in companion animals, including diagnostic approaches and treatment outcomes.",
            keyPoints: [
              "Dilated cardiomyopathy management in large breed dogs",
              "Mitral valve disease progression in small breeds",
              "Diagnostic imaging techniques in veterinary cardiology",
              "Evidence-based treatment protocols",
            ],
            metadata: {
              studyType: "Case Series",
              numberOfCases: "15 cases",
              duration: "24 months",
              primaryEndpoint: "Clinical improvement",
            },
          },
          labels: ["Cardiology", "Veterinary Medicine", "Case Studies"],
          status: "pending",
          user_id: "test-user-id-2",
          uploaded_by: "cardiology@vetclinic.com",
        },
      ]

      for (const testFile of testFiles) {
        const { error } = await supabase.from("processed_data").insert(testFile)

        if (error) {
          console.error("Error adding test file:", error)
        }
      }

      fetchDbFiles()
      toast({
        title: "Test files added",
        description: "Added test pending files for approval demo",
      })
    } catch (error) {
      console.error("Error adding test files:", error)
    }
  }, [isAdmin, user, fetchDbFiles, toast])

  // Combine database files with completed uploaded files for the Files tab
  const allFiles = [
    ...dbFiles,
    ...uploadedFiles
      .filter((f) => f.status === "completed" && f.processedData)
      .map((f) => ({
        id: f.id,
        name: f.file.name,
        type: detectFileType(f.file.name),
        source: "upload",
        original_content: "File content...", // This would be the actual content
        extracted_data: f.processedData,
        labels: ["veterinary", "research"],
        status: isAdmin ? "ready" : "pending",
        user_id: user?.id || "anonymous",
        uploaded_by: user?.emailAddresses[0]?.emailAddress || "anonymous",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
  ]

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
                    Admin Access
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
          {/* Admin Notice */}
          {isAdmin && (
            <div className="mb-6">
              <Card className="bg-yellow-900/20 border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-yellow-400" />
                      <div>
                        <p className="text-yellow-300 text-sm">
                          <strong>Admin Mode:</strong> You can preview, approve, and reject all uploaded files.
                          {pendingFiles.length > 0 ? (
                            <span className="ml-2 font-bold">
                              {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""} pending approval!
                            </span>
                          ) : (
                            <span className="ml-2">No files pending approval.</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {pendingFiles.length === 0 && (
                      <Button
                        onClick={addTestPendingFiles}
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        Add Test Files for Demo
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
            <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="upload" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Upload className="h-4 w-4 mr-2" />
                Upload
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-300px)]">
                {/* Left Panel - Data Input */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Upload className="h-5 w-5 mr-2 text-blue-500" />
                      Data Input
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Upload veterinary files or provide URLs to scrape and process content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* File Upload Section */}
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
                        Drop veterinary files here or click to upload
                      </p>
                      <p className="text-sm text-slate-500">Supports TXT, PDF, DOC files • Multiple files supported</p>
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
                      <div className="space-y-3">
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
                              <div className="text-xs text-blue-400">Processing with AI...</div>
                            )}
                            {file.status === "completed" && (
                              <div className="text-xs text-green-400">✓ Successfully processed!</div>
                            )}
                            {file.status === "error" && <div className="text-xs text-red-400">✗ {file.error}</div>}
                          </div>
                        ))}
                        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-green-300 text-sm">
                              Successfully processed {uploadedFiles.filter((f) => f.status === "completed").length}{" "}
                              file(s)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Processed Data List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-medium flex items-center">
                          <Database className="h-4 w-4 mr-2" />
                          Processed Data ({allFiles.length})
                        </h4>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>

                      <ScrollArea className="h-[300px]">
                        {allFiles.length > 0 ? (
                          <div className="space-y-2">
                            {allFiles.map((file) => (
                              <div
                                key={file.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedFile?.id === file.id
                                    ? "border-blue-500 bg-blue-500/10"
                                    : "border-slate-600 hover:border-slate-500 bg-slate-700/30"
                                }`}
                                onClick={() => setSelectedFile(file)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="h-4 w-4 text-blue-400" />
                                    <span className="text-white text-sm font-medium truncate max-w-[150px]">
                                      {file.name}
                                    </span>
                                  </div>
                                  {getDbStatusBadge(file.status)}
                                </div>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
                                    {file.type.replace("-", " ")}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
                                    {file.source}
                                  </Badge>
                                  <span className="text-xs text-slate-500">
                                    {new Date(file.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Files className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">No files processed yet</p>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Panel - Data Review */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-500" />
                      Data Review
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Review and approve processed veterinary content before training
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedFile ? (
                      <div className="space-y-6">
                        <ScrollArea className="h-[calc(100vh-500px)]">
                          <div className="space-y-6">
                            {/* Extracted Information */}
                            <div>
                              <h3 className="text-white font-semibold mb-4">Extracted Information</h3>

                              {/* Title */}
                              <div className="mb-4">
                                <Label className="text-slate-300 text-sm font-medium">Title</Label>
                                <div className="mt-1 p-3 bg-slate-700/50 rounded border border-slate-600">
                                  <p className="text-white text-sm">
                                    {selectedFile.extracted_data?.title || selectedFile.name}
                                  </p>
                                </div>
                              </div>

                              {/* Summary */}
                              <div className="mb-4">
                                <Label className="text-slate-300 text-sm font-medium">Summary</Label>
                                <div className="mt-1 p-3 bg-slate-700/50 rounded border border-slate-600">
                                  <p className="text-white text-sm leading-relaxed">
                                    {selectedFile.extracted_data?.summary ||
                                      "Written SOPs are an essential part of ensuring production of accurate and reliable results in the in-clinic laboratory. Purpose and Benefits of SOPs The purpose of SOPs in an in-clinic laboratory is to ensure consistency and quality of results. In the authors' experience, job sat- ABBREVIATIONS Quality control Standard operating procedure This is is the third installment in a series of 5 articles intended to help veterinary practitioners and their staff provide quality management for in-clinic laboratory testing."}
                                  </p>
                                </div>
                              </div>

                              {/* Key Points */}
                              <div className="mb-4">
                                <Label className="text-slate-300 text-sm font-medium">Key Points</Label>
                                <div className="mt-1 p-3 bg-slate-700/50 rounded border border-slate-600">
                                  <ul className="space-y-1">
                                    {selectedFile.extracted_data?.keyPoints?.map((point: string, index: number) => (
                                      <li key={index} className="text-white text-sm flex items-start space-x-2">
                                        <span className="text-blue-400 mt-1">•</span>
                                        <span>{point}</span>
                                      </li>
                                    )) || (
                                      <>
                                        <li className="text-white text-sm flex items-start space-x-2">
                                          <span className="text-blue-400 mt-1">•</span>
                                          <span>Individual tests or test panels recommended by</span>
                                        </li>
                                        <li className="text-white text-sm flex items-start space-x-2">
                                          <span className="text-blue-400 mt-1">•</span>
                                          <span>
                                            This table is not intended to include all possible topics or aspects of
                                            laboratory function that may be addressed by SOPs. †Exact instructions
                                          </span>
                                        </li>
                                        <li className="text-white text-sm flex items-start space-x-2">
                                          <span className="text-blue-400 mt-1">•</span>
                                          <span>Specimen collection policies of the clinic (eg, stan-</span>
                                        </li>
                                        <li className="text-white text-sm flex items-start space-x-2">
                                          <span className="text-blue-400 mt-1">•</span>
                                          <span>Patient preparation (eg, unfed or fed status or test-</span>
                                        </li>
                                      </>
                                    )}
                                  </ul>
                                </div>
                              </div>

                              {/* Metadata */}
                              <div className="mb-4">
                                <Label className="text-slate-300 text-sm font-medium">Metadata</Label>
                                <div className="mt-1 grid grid-cols-2 gap-3">
                                  <div className="bg-slate-700/50 p-3 rounded border border-slate-600">
                                    <div className="text-xs text-slate-400">Word Count:</div>
                                    <div className="text-white text-sm">~3,258 words</div>
                                  </div>
                                  <div className="bg-slate-700/50 p-3 rounded border border-slate-600">
                                    <div className="text-xs text-slate-400">Content Focus:</div>
                                    <div className="text-white text-sm">Animal Health</div>
                                  </div>
                                  <div className="bg-slate-700/50 p-3 rounded border border-slate-600">
                                    <div className="text-xs text-slate-400">Document Type:</div>
                                    <div className="text-white text-sm">Clinical Report</div>
                                  </div>
                                  <div className="bg-slate-700/50 p-3 rounded border border-slate-600">
                                    <div className="text-xs text-slate-400">Processing Date:</div>
                                    <div className="text-white text-sm">2025-07-21</div>
                                  </div>
                                  <div className="bg-slate-700/50 p-3 rounded border border-slate-600">
                                    <div className="text-xs text-slate-400">Animals Mentioned:</div>
                                    <div className="text-white text-sm">cat, dog</div>
                                  </div>
                                </div>
                              </div>

                              {/* Assign Veterinary Labels */}
                              <div className="mb-4">
                                <Label className="text-slate-300 text-sm font-medium">Assign Veterinary Labels</Label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {[
                                    "Small Animal Medicine",
                                    "Large Animal Medicine",
                                    "Exotic Animal Medicine",
                                    "Veterinary Surgery",
                                    "Animal Pathology",
                                    "Clinical Diagnosis",
                                    "Treatment Protocols",
                                    "Preventive Medicine",
                                    "Animal Nutrition",
                                    "Veterinary Pharmacology",
                                    "Animal Behavior",
                                    "Emergency Medicine",
                                    "Veterinary Oncology",
                                    "Reproductive Medicine",
                                    "Infectious Diseases",
                                  ].map((label) => (
                                    <Badge
                                      key={label}
                                      variant="secondary"
                                      className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs cursor-pointer hover:bg-blue-500/30"
                                    >
                                      {label}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Processed Content Preview */}
                              <div className="mb-4">
                                <Label className="text-slate-300 text-sm font-medium">Processed Content Preview</Label>
                                <div className="mt-1 p-3 bg-slate-700/50 rounded border border-slate-600 max-h-32 overflow-y-auto">
                                  <pre className="text-white text-xs whitespace-pre-wrap font-mono">
                                    {`Quality Management for In-Clinic Laboratories
Standard operating procedures
Kathleen P. Freeman dvm, phd
Jennifer R. Cook dvm, ms
Emma H. Hooijberg bvsc, phd
From Synlab-VPG/Exeter, Exeter Science Park, Exeter EX5 2FN, England (Freeman);`}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </div>
                        </ScrollArea>

                        {/* Action Buttons - Always visible at bottom */}
                        {isAdmin && selectedFile.status === "pending" && (
                          <div className="border-t border-slate-600 pt-4">
                            <div className="flex space-x-3">
                              <Button
                                onClick={() => approveFile(selectedFile.id)}
                                size="lg"
                                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white border border-slate-600"
                              >
                                ✓ Approve
                              </Button>
                              <Button
                                onClick={() => rejectFile(selectedFile.id)}
                                variant="outline"
                                size="lg"
                                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-400">Select a file to review</p>
                        <p className="text-sm text-slate-500 mt-2">
                          Click on a file from the processed data list to see its details
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
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
