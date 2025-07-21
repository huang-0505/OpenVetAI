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
            <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="upload" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Files className="h-4 w-4 mr-2" />
                Files{" "}
                {pendingFiles.length > 0 && (
                  <Badge className="ml-2 bg-yellow-500 text-black text-xs px-1 py-0">{pendingFiles.length}</Badge>
                )}
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
                        <div className="text-2xl font-bold text-blue-400">{allFiles.length}</div>
                        <div className="text-sm text-slate-400">Total Files</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 p-4 rounded-lg border border-green-500/20 text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {allFiles.filter((f) => f.status === "approved" || f.status === "ready").length}
                        </div>
                        <div className="text-sm text-slate-400">Approved</div>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                          {allFiles.filter((f) => f.status === "pending").length +
                            uploadedFiles.filter((f) => f.status === "processing").length}
                        </div>
                        <div className="text-sm text-slate-400">Pending</div>
                      </div>
                      <div className="bg-gradient-to-br from-red-600/20 to-red-500/10 p-4 rounded-lg border border-red-500/20 text-center">
                        <div className="text-2xl font-bold text-red-400">
                          {allFiles.filter((f) => f.status === "rejected").length +
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
                      <div className="text-2xl font-bold text-yellow-400">{pendingFiles.length}</div>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-300px)]">
                {/* Left Panel - File List (No Upload) */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Files className="h-5 w-5 mr-2 text-blue-500" />
                      Uploaded Files
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Select a file to review and approve processed content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[calc(100vh-450px)]">
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
                                  <span className="text-white text-sm font-medium truncate max-w-[200px]">
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
                          <p className="text-slate-400 text-sm">No files uploaded yet</p>
                          <p className="text-slate-500 text-xs mt-1">Go to Upload tab to upload files</p>
                        </div>
                      )}
                    </ScrollArea>
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
                      Review and approve processed content before training
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedFile ? (
                      <ScrollArea className="h-[calc(100vh-450px)]">
                        <div className="space-y-6">
                          {/* Extracted Information */}
                          <div className="space-y-4">
                            <h3 className="text-white font-semibold">Extracted Information</h3>

                            {/* Title */}
                            <div>
                              <Label className="text-slate-300 text-sm font-medium">Title</Label>
                              <div className="mt-1 p-3 bg-slate-700/50 rounded border border-slate-600">
                                <p className="text-white text-sm">
                                  {selectedFile.extracted_data?.title || selectedFile.name}
                                </p>
                              </div>
                            </div>

                            {/* Summary */}
                            <div>
                              <Label className="text-slate-300 text-sm font-medium">Summary</Label>
                              <div className="mt-1 p-3 bg-slate-700/50 rounded border border-slate-600">
                                <p className="text-white text-sm leading-relaxed">
                                  {selectedFile.extracted_data?.summary ||
                                    "This medical journal article presents research findings on clinical outcomes and treatment efficacy."}
                                </p>
                              </div>
                            </div>

                            {/* Key Points */}
                            <div>
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
                                        <span>Study methodology and patient demographics</span>
                                      </li>
                                      <li className="text-white text-sm flex items-start space-x-2">
                                        <span className="text-blue-400 mt-1">•</span>
                                        <span>Primary and secondary endpoints</span>
                                      </li>
                                      <li className="text-white text-sm flex items-start space-x-2">
                                        <span className="text-blue-400 mt-1">•</span>
                                        <span>Statistical analysis and results</span>
                                      </li>
                                      <li className="text-white text-sm flex items-start space-x-2">
                                        <span className="text-blue-400 mt-1">•</span>
                                        <span>Clinical implications and recommendations</span>
                                      </li>
                                    </>
                                  )}
                                </ul>
                              </div>
                            </div>

                            {/* Metadata */}
                            <div>
                              <Label className="text-slate-300 text-sm font-medium">Metadata</Label>
                              <div className="mt-1 grid grid-cols-2 gap-3">
                                <div className="bg-slate-700/50 p-3 rounded border border-slate-600">
                                  <div className="text-xs text-slate-400 uppercase tracking-wide">Study Type:</div>
                                  <div className="text-white text-sm mt-1">
                                    {selectedFile.extracted_data?.metadata?.studyType || "Clinical Trial"}
                                  </div>
                                </div>
                                <div className="bg-slate-700/50 p-3 rounded border border-slate-600">
                                  <div className="text-xs text-slate-400 uppercase tracking-wide">Sample Size:</div>
                                  <div className="text-white text-sm mt-1">
                                    {selectedFile.extracted_data?.metadata?.sampleSize || "N=245"}
                                  </div>
                                </div>
                                <div className="bg-slate-700/50 p-3 rounded border border-slate-600">
                                  <div className="text-xs text-slate-400 uppercase tracking-wide">Duration:</div>
                                  <div className="text-white text-sm mt-1">
                                    {selectedFile.extracted_data?.metadata?.duration || "12 months"}
                                  </div>
                                </div>
                                <div className="bg-slate-700/50 p-3 rounded border border-slate-600">
                                  <div className="text-xs text-slate-400 uppercase tracking-wide">
                                    Primary Endpoint:
                                  </div>
                                  <div className="text-white text-sm mt-1">
                                    {selectedFile.extracted_data?.metadata?.primaryEndpoint || "Treatment efficacy"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Assign Labels */}
                            <div>
                              <Label className="text-slate-300 text-sm font-medium">Assign Labels</Label>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {[
                                  "Medical Research",
                                  "Clinical Trial",
                                  "Nutrition",
                                  "Fitness",
                                  "Mental Health",
                                  "Cardiology",
                                  "Oncology",
                                  "Pediatrics",
                                  "Geriatrics",
                                  "Pharmacology",
                                  "Diet Plans",
                                  "Exercise Routines",
                                  "Wellness Tips",
                                  "Health News",
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
                            <div>
                              <Label className="text-slate-300 text-sm font-medium">Processed Content Preview</Label>
                              <div className="mt-1 p-3 bg-slate-700/50 rounded border border-slate-600 max-h-32 overflow-y-auto">
                                <pre className="text-white text-xs whitespace-pre-wrap font-mono">
                                  {selectedFile.original_content?.substring(0, 500) ||
                                    "Contributors\nAcknowledgements\n1. Review of Cardiovascular and Respiratory Physiology\nThe Cardiovascular System\nRespiratory Physiology\n2. The Preanesthetic Workup"}
                                  ...
                                </pre>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons - Always show for pending files when admin */}
                          {isAdmin && selectedFile && selectedFile.status === "pending" && (
                            <div className="mt-6 pt-4 border-t border-slate-600">
                              <div className="flex space-x-3">
                                <Button
                                  onClick={() => rejectFile(selectedFile.id)}
                                  variant="outline"
                                  className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                                >
                                  Reject File
                                </Button>
                                <Button
                                  onClick={() => approveFile(selectedFile.id)}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve File
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-400">Select a file to review</p>
                        <p className="text-sm text-slate-500 mt-2">
                          Click on a file from the left panel to see its details
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
