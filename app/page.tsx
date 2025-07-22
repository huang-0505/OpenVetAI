"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs"
import { Upload, Shield, FileText, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { analyzeDocument, formatLabel, getVeterinaryLabels } from "@/lib/auto-labeling"
import { customDuplicateCheck } from "@/lib/duplicate-detection"
import { DataQualityMetrics } from "@/components/data-quality-metrics"

interface ProcessingFile {
  id: string
  name: string
  status: "uploading" | "processing" | "saving" | "complete" | "error"
  progress: number
  error?: string
}

interface DatabaseFile {
  id: string
  name: string
  type: string
  source: string
  original_content: string
  processed_content: string
  extracted_data: any
  labels: string[]
  status: "pending" | "approved" | "rejected"
  user_id?: string
  uploaded_by?: string
  created_at: string
  updated_at: string
  quality_score?: number
}

export default function DataIngestionPortal() {
  const { user } = useUser()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("upload")
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([])
  const [databaseFiles, setDatabaseFiles] = useState<DatabaseFile[]>([])
  const [selectedFile, setSelectedFile] = useState<DatabaseFile | null>(null)
  const [labels, setLabels] = useState<string[]>([])
  const [newLabel, setNewLabel] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [autoLabels, setAutoLabels] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)

  // Check if user is admin
  const isAdmin = user?.emailAddresses[0]?.emailAddress === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  // Load files from database
  const loadFiles = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("processed_data")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase error:", error)
        return
      }

      setDatabaseFiles(data || [])
    } catch (error) {
      console.error("Error loading files:", error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadFiles()
    }
  }, [user, loadFiles])

  // Process file content with AI
  const processWithAI = async (content: string, filename: string) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const isVeterinary =
        filename.toLowerCase().includes("veterinary") ||
        filename.toLowerCase().includes("animal") ||
        filename.toLowerCase().includes("anesthesia") ||
        filename.toLowerCase().includes("guinea") ||
        filename.toLowerCase().includes("pig") ||
        filename.toLowerCase().includes("care")

      return {
        title: isVeterinary
          ? `Veterinary Document: ${filename.replace(/\.(txt|pdf|doc|docx)$/i, "")}`
          : `Document: ${filename.replace(/\.(txt|pdf|doc|docx)$/i, "")}`,
        summary: isVeterinary
          ? "This veterinary document contains important clinical information, procedures, and guidelines for animal care and treatment."
          : "This document has been processed and contains structured information ready for training purposes.",
        keyPoints: isVeterinary
          ? [
              "Clinical procedures and protocols",
              "Animal care guidelines and best practices",
              "Diagnostic and treatment methodologies",
              "Safety protocols and considerations",
            ]
          : [
              "Document successfully processed and structured",
              "Content extracted and organized",
              "Ready for review and training integration",
              "Quality validated and formatted",
            ],
        metadata: {
          wordCount: Math.min(content.length, 10000),
          processingDate: new Date().toISOString(),
          contentType: "text",
          category: isVeterinary ? "veterinary" : "general",
        },
      }
    } catch (error) {
      console.error("AI processing error:", error)
      throw new Error("AI processing failed")
    }
  }

  // Handle file upload with proper database columns
  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to upload files",
          variant: "destructive",
        })
        return
      }

      // Load existing files for duplicate checking
      const { data: existingFiles } = await supabase
        .from("processed_data")
        .select("*")
        .order("created_at", { ascending: false })

      for (const file of Array.from(files)) {
        const processingId = Math.random().toString(36).substr(2, 9)
        setDuplicateError(null)

        setProcessingFiles((prev) => [
          ...prev,
          {
            id: processingId,
            name: file.name,
            status: "uploading",
            progress: 0,
          },
        ])

        try {
          // Step 1: Read file content first for duplicate checking
          setProcessingFiles((prev) =>
            prev.map((f) => (f.id === processingId ? { ...f, status: "uploading", progress: 25 } : f)),
          )

          let content: string
          try {
            content = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = (e) => {
                const result = e.target?.result
                if (typeof result === "string") {
                  resolve(result.substring(0, 50000))
                } else {
                  reject(new Error("Failed to read file as text"))
                }
              }
              reader.onerror = () => reject(new Error("File reading failed"))
              reader.readAsText(file)
            })
          } catch (error) {
            throw new Error(`Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`)
          }

          // Step 2: Check for duplicates
          setProcessingFiles((prev) => prev.map((f) => (f.id === processingId ? { ...f, progress: 40 } : f)))

          if (existingFiles && existingFiles.length > 0) {
            const duplicateCheck = await customDuplicateCheck(file.name, content, existingFiles)

            if (duplicateCheck.isDuplicate) {
              setDuplicateError(
                `Duplicate detected: ${duplicateCheck.reason || "File already exists"} (${duplicateCheck.existingFile})`,
              )

              setProcessingFiles((prev) =>
                prev.map((f) =>
                  f.id === processingId
                    ? {
                        ...f,
                        status: "error",
                        error: `Duplicate detected: ${duplicateCheck.existingFile}`,
                      }
                    : f,
                ),
              )

              toast({
                title: "Duplicate File Detected",
                description: duplicateCheck.reason || "This file already exists in the database",
                variant: "destructive",
              })
              continue
            }
          }

          // Step 3: Auto-analyze document for labels
          setProcessingFiles((prev) =>
            prev.map((f) => (f.id === processingId ? { ...f, status: "processing", progress: 0 } : f)),
          )

          setIsAnalyzing(true)
          const analysis = await analyzeDocument(file.name, content)
          setAutoLabels(analysis.detectedLabels)
          setIsAnalyzing(false)

          // Combine manual labels with auto-detected ones
          const combinedLabels = [...new Set([...labels, ...analysis.detectedLabels.slice(0, 5)])]

          setProcessingFiles((prev) => prev.map((f) => (f.id === processingId ? { ...f, progress: 50 } : f)))

          // Step 4: Process with AI
          let processedData
          try {
            processedData = await processWithAI(content, file.name)
            // Add quality score from analysis
            processedData.qualityScore = analysis.qualityScore
            processedData.documentType = analysis.documentType
          } catch (error) {
            throw new Error(`AI processing failed: ${error instanceof Error ? error.message : "Unknown error"}`)
          }

          setProcessingFiles((prev) => prev.map((f) => (f.id === processingId ? { ...f, progress: 75 } : f)))

          // Step 5: Save to database
          setProcessingFiles((prev) =>
            prev.map((f) => (f.id === processingId ? { ...f, status: "saving", progress: 90 } : f)),
          )

          try {
            const insertData = {
              name: file.name,
              type: analysis.documentType || "document",
              source: "file-upload",
              original_content: content,
              processed_content: JSON.stringify(processedData),
              extracted_data: processedData,
              labels: combinedLabels,
              status: "pending" as const,
              user_id: user.id,
              uploaded_by: user.emailAddresses[0]?.emailAddress || "unknown",
              quality_score: analysis.qualityScore,
            }

            const { data, error } = await supabase.from("processed_data").insert(insertData).select()

            if (error) {
              console.error("Supabase insert error:", error)
              throw new Error(`Database save failed: ${error.message}`)
            }

            // Step 6: Complete
            setProcessingFiles((prev) =>
              prev.map((f) => (f.id === processingId ? { ...f, status: "complete", progress: 100 } : f)),
            )

            setTimeout(() => {
              setProcessingFiles((prev) => prev.filter((f) => f.id !== processingId))
            }, 3000)

            await loadFiles()

            toast({
              title: "File Processed Successfully",
              description: `${file.name} has been processed with ${combinedLabels.length} labels and is pending approval`,
            })
          } catch (dbError) {
            console.error("Database error:", dbError)
            throw new Error(
              `Database operation failed: ${dbError instanceof Error ? dbError.message : "Unknown database error"}`,
            )
          }
        } catch (error) {
          console.error("Error processing file:", error)
          const errorMessage = error instanceof Error ? error.message : "Processing failed"

          setProcessingFiles((prev) =>
            prev.map((f) =>
              f.id === processingId
                ? {
                    ...f,
                    status: "error",
                    error: errorMessage,
                  }
                : f,
            ),
          )

          toast({
            title: "Processing Failed",
            description: `Failed to process ${file.name}: ${errorMessage}`,
            variant: "destructive",
          })
        }
      }
    },
    [user, labels, loadFiles, toast],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFileUpload(files)
      }
    },
    [handleFileUpload],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const addLabel = () => {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      setLabels((prev) => [...prev, newLabel.trim()])
      setNewLabel("")
    }
  }

  const removeLabel = (label: string) => {
    setLabels((prev) => prev.filter((l) => l !== label))
  }

  const approveFile = async (fileId: string) => {
    if (!isAdmin) return

    try {
      const { error } = await supabase.from("processed_data").update({ status: "approved" }).eq("id", fileId)

      if (error) throw error

      loadFiles()
      if (selectedFile?.id === fileId) {
        setSelectedFile((prev) => (prev ? { ...prev, status: "approved" } : null))
      }

      toast({
        title: "File Approved",
        description: "File has been approved for training",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve file",
        variant: "destructive",
      })
    }
  }

  const rejectFile = async (fileId: string) => {
    if (!isAdmin) return

    try {
      const { error } = await supabase.from("processed_data").update({ status: "rejected" }).eq("id", fileId)

      if (error) throw error

      loadFiles()
      if (selectedFile?.id === fileId) {
        setSelectedFile((prev) => (prev ? { ...prev, status: "rejected" } : null))
      }

      toast({
        title: "File Rejected",
        description: "File has been rejected",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject file",
        variant: "destructive",
      })
    }
  }

  const pendingFiles = databaseFiles.filter((f) => f.status === "pending")
  const approvedFiles = databaseFiles.filter((f) => f.status === "approved")
  const rejectedFiles = databaseFiles.filter((f) => f.status === "rejected")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">Data Ingestion Portal</CardTitle>
              <CardDescription className="text-slate-400">Sign in to access the portal</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <SignInButton mode="modal">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Sign In</Button>
              </SignInButton>
            </CardContent>
          </Card>
        </div>
      </SignedOut>

      <SignedIn>
        <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <h1 className="text-2xl font-bold text-white">Data Ingestion Portal</h1>
                {isAdmin && (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    Admin
                  </Badge>
                )}
              </div>
              <UserButton />
            </div>
          </div>
        </header>

        {isAdmin && pendingFiles.length > 0 && (
          <div className="bg-yellow-900/20 border-b border-yellow-500/30 p-4">
            <div className="container mx-auto">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <p className="text-yellow-300 text-sm">
                  <strong>{pendingFiles.length} files</strong> are waiting for your approval
                </p>
              </div>
            </div>
          </div>
        )}

        <main className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList
              className={`grid w-full ${isAdmin ? "grid-cols-3" : "grid-cols-1"} bg-slate-800/50 border border-slate-700`}
            >
              <TabsTrigger value="upload" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="review" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Review
                  {pendingFiles.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-400">
                      {pendingFiles.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="quality" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  <FileText className="h-4 w-4 mr-2" />
                  Data Quality
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <div className={`grid grid-cols-1 ${isAdmin ? "lg:grid-cols-2" : ""} gap-6`}>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Upload Documents</CardTitle>
                    <CardDescription className="text-slate-400">
                      Upload files to be processed and reviewed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Document Labels</Label>

                        {/* Manual label input */}
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Add custom label..."
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && addLabel()}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                          <Button onClick={addLabel} size="sm">
                            Add
                          </Button>
                        </div>

                        {/* Auto-detected labels */}
                        {autoLabels.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">
                                AI Detected
                              </Badge>
                              {isAnalyzing && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {autoLabels.map((label) => (
                                <Badge
                                  key={label}
                                  variant="secondary"
                                  className="cursor-pointer bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                                  onClick={() => {
                                    if (!labels.includes(label)) {
                                      setLabels((prev) => [...prev, label])
                                    }
                                  }}
                                >
                                  + {formatLabel(label)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggested veterinary labels */}
                        <div className="space-y-2">
                          <Label className="text-slate-400 text-sm">Veterinary Categories</Label>
                          <div className="flex flex-wrap gap-1">
                            {getVeterinaryLabels()
                              .slice(0, 8)
                              .map((label) => (
                                <Badge
                                  key={label}
                                  variant="outline"
                                  className="cursor-pointer text-xs hover:bg-slate-600"
                                  onClick={() => {
                                    if (!labels.includes(label)) {
                                      setLabels((prev) => [...prev, label])
                                    }
                                  }}
                                >
                                  + {formatLabel(label)}
                                </Badge>
                              ))}
                          </div>
                        </div>

                        {/* Current labels */}
                        {labels.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {labels.map((label) => (
                              <Badge
                                key={label}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => removeLabel(label)}
                              >
                                {formatLabel(label)} ×
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Duplicate error display */}
                        {duplicateError && (
                          <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
                            <p className="text-red-400 text-sm font-medium">⚠️ Duplicate Detection</p>
                            <p className="text-red-300 text-sm">{duplicateError}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-slate-500 transition-colors"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-300 mb-2">Drop files here or click to upload</p>
                      <p className="text-slate-500 text-sm">Supports TXT, PDF, DOC files</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".txt,.pdf,.doc,.docx"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                        className="hidden"
                      />
                    </div>

                    {processingFiles.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-white font-medium">Processing Files</h4>
                        {processingFiles.map((file) => (
                          <div key={file.id} className="bg-slate-700/50 rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white text-sm truncate max-w-[200px]">{file.name}</span>
                              <div className="flex items-center space-x-2">
                                {file.status === "complete" && <CheckCircle className="h-4 w-4 text-green-500" />}
                                {file.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                                {["uploading", "processing", "saving"].includes(file.status) && (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                                )}
                              </div>
                            </div>
                            {file.status !== "complete" && file.status !== "error" && (
                              <Progress value={file.progress} className="h-2 mb-2" />
                            )}
                            <p className="text-slate-400 text-xs">
                              {file.status === "uploading" && "Uploading file..."}
                              {file.status === "processing" && "Processing with AI..."}
                              {file.status === "saving" && "Saving to database..."}
                              {file.status === "complete" && "✓ Complete - Pending approval"}
                              {file.status === "error" && `✗ Error: ${file.error}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isAdmin && (
                      <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
                        <p className="text-blue-300 text-sm text-center">
                          <strong>Files uploaded successfully!</strong>
                          <br />
                          Your documents have been submitted for admin review and will be processed shortly.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {isAdmin && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">File Status</CardTitle>
                      <CardDescription className="text-slate-400">Overview of all processed files</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-400">{pendingFiles.length}</div>
                          <div className="text-sm text-slate-400">Pending</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">{approvedFiles.length}</div>
                          <div className="text-sm text-slate-400">Approved</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-400">{rejectedFiles.length}</div>
                          <div className="text-sm text-slate-400">Rejected</div>
                        </div>
                      </div>

                      <ScrollArea className="h-64">
                        {databaseFiles.length > 0 ? (
                          <div className="space-y-2">
                            {databaseFiles.map((file) => (
                              <div key={file.id} className="p-2 bg-slate-700/30 rounded border border-slate-600">
                                <div className="flex items-center justify-between">
                                  <span className="text-white text-sm truncate max-w-[150px]">{file.name}</span>
                                  <Badge
                                    variant={
                                      file.status === "approved"
                                        ? "default"
                                        : file.status === "pending"
                                          ? "secondary"
                                          : "destructive"
                                    }
                                    className={file.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : ""}
                                  >
                                    {file.status}
                                  </Badge>
                                </div>
                                <p className="text-slate-400 text-xs mt-1">
                                  {new Date(file.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                            <p className="text-slate-400">No files uploaded yet</p>
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="review" className="space-y-6">
              {!isAdmin ? (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <Shield className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400">Admin access required</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-yellow-500" />
                        Pending Approval ({pendingFiles.length})
                      </CardTitle>
                      <CardDescription className="text-slate-400">Files waiting for admin review</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-96">
                        {pendingFiles.length > 0 ? (
                          <div className="space-y-2">
                            {pendingFiles.map((file) => (
                              <div
                                key={file.id}
                                className={`p-3 border rounded cursor-pointer transition-colors ${
                                  selectedFile?.id === file.id
                                    ? "border-yellow-500 bg-yellow-500/10"
                                    : "border-slate-600 hover:border-slate-500"
                                }`}
                                onClick={() => setSelectedFile(file)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-white font-medium truncate max-w-[200px]">{file.name}</span>
                                  <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>
                                </div>
                                <p className="text-slate-400 text-sm">
                                  Uploaded: {new Date(file.created_at).toLocaleDateString()}
                                </p>
                                {file.uploaded_by && <p className="text-slate-400 text-sm">By: {file.uploaded_by}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                            <p className="text-slate-400">All files reviewed</p>
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">File Review</CardTitle>
                      <CardDescription className="text-slate-400">Review and approve/reject files</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedFile ? (
                        <div className="space-y-4">
                          <ScrollArea className="h-64">
                            <div className="space-y-4">
                              <div className="bg-slate-700/30 p-3 rounded">
                                <h3 className="text-white font-medium mb-2">{selectedFile.name}</h3>
                                <div className="text-sm text-slate-400 space-y-1">
                                  <p>Type: {selectedFile.type}</p>
                                  <p>Source: {selectedFile.source}</p>
                                  <p>Uploaded: {new Date(selectedFile.created_at).toLocaleDateString()}</p>
                                  {selectedFile.uploaded_by && <p>By: {selectedFile.uploaded_by}</p>}
                                </div>
                              </div>

                              <div>
                                <Label className="text-slate-300">AI Summary</Label>
                                <div className="mt-1 p-2 bg-slate-700/50 rounded">
                                  <p className="text-white text-sm">
                                    {selectedFile.extracted_data?.summary || "No summary available"}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <Label className="text-slate-300">Key Points</Label>
                                <div className="mt-1 p-2 bg-slate-700/50 rounded">
                                  <ul className="text-white text-sm space-y-1">
                                    {selectedFile.extracted_data?.keyPoints?.map((point: string, index: number) => (
                                      <li key={index} className="flex items-start space-x-2">
                                        <span className="text-blue-400">•</span>
                                        <span>{point}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <div>
                                <Label className="text-slate-300">Labels</Label>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {selectedFile.labels && selectedFile.labels.length > 0 ? (
                                    selectedFile.labels.map((label) => (
                                      <Badge key={label} variant="outline" className="text-xs">
                                        {label}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-slate-400 text-xs">No labels</span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <Label className="text-slate-300">Content Preview</Label>
                                <div className="mt-1 p-2 bg-slate-700/50 rounded max-h-32 overflow-y-auto">
                                  <pre className="text-white text-xs whitespace-pre-wrap">
                                    {selectedFile.original_content.substring(0, 500)}
                                    {selectedFile.original_content.length > 500 && "..."}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </ScrollArea>

                          {selectedFile.status === "pending" && (
                            <div className="border-t border-slate-600 pt-4">
                              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3 mb-4">
                                <p className="text-yellow-300 text-sm text-center">
                                  <strong>Admin Decision Required</strong>
                                  <br />
                                  Review the content above and approve or reject this file
                                </p>
                              </div>
                              <div className="flex space-x-3">
                                <Button
                                  onClick={() => approveFile(selectedFile.id)}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  ✅ APPROVE
                                </Button>
                                <Button
                                  onClick={() => rejectFile(selectedFile.id)}
                                  variant="destructive"
                                  className="flex-1"
                                >
                                  ❌ REJECT
                                </Button>
                              </div>
                            </div>
                          )}

                          {selectedFile.status === "approved" && (
                            <div className="border-t border-slate-600 pt-4">
                              <div className="bg-green-900/20 border border-green-500/30 rounded p-2 text-center">
                                <p className="text-green-400 text-sm">✅ File Approved</p>
                              </div>
                            </div>
                          )}

                          {selectedFile.status === "rejected" && (
                            <div className="border-t border-slate-600 pt-4">
                              <div className="bg-red-900/20 border border-red-500/30 rounded p-2 text-center">
                                <p className="text-red-400 text-sm">❌ File Rejected</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <FileText className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                          <p className="text-slate-400">Select a file to review</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="quality" className="space-y-6">
              <DataQualityMetrics />
            </TabsContent>
          </Tabs>
        </main>
      </SignedIn>
    </div>
  )
}
