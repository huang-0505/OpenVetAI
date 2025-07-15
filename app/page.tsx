"use client"

import { useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  Upload,
  FileText,
  Globe,
  Database,
  Settings,
  Trash2,
  Filter,
  CheckSquare,
  Square,
  Eye,
  Loader2,
} from "lucide-react"
import { UserMenu } from "@/components/user-menu"
import { DatabaseStatus } from "@/components/database-status"
import { DataViewer } from "@/components/data-viewer"
import { DataQualityMetrics } from "@/components/data-quality-metrics"
import { detectDuplicates } from "@/lib/duplicate-detection"
import { processWithAI } from "@/lib/ai-processing"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  content: string
  status: "processing" | "completed" | "error"
  progress: number
  extractedData?: {
    title?: string
    summary?: string
    keyPoints?: string[]
    labels?: string[]
  }
  qualityScore?: number
  qualityLevel?: "Excellent" | "Good" | "Fair" | "Poor"
  isDuplicate?: boolean
  duplicateOf?: string
  uploadedAt: Date
}

const ALLOWED_FILE_TYPES = [".txt", ".pdf", ".doc", ".docx", ".md"]

export default function DataIngestionPortal() {
  const { data: session, status } = useSession()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [urlInput, setUrlInput] = useState("")
  const [trainingFrequency, setTrainingFrequency] = useState("weekly")
  const [qualityFilter, setQualityFilter] = useState<string>("all")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (selectedFiles: FileList) => {
    const newFiles: UploadedFile[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]

      // Check file type
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
      if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
        toast.error(`File type ${fileExtension} is not supported. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`)
        continue
      }

      const fileId = `${Date.now()}-${i}`
      const content = await file.text()

      // Check for duplicates
      const isDuplicate = detectDuplicates(file, Array.from(selectedFiles))

      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        content,
        status: "processing",
        progress: 0,
        isDuplicate,
        uploadedAt: new Date(),
      }

      newFiles.push(newFile)
    }

    setFiles((prev) => [...prev, ...newFiles])

    // Process each file
    newFiles.forEach(async (file) => {
      try {
        // Simulate processing progress
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise((resolve) => setTimeout(resolve, 200))
          setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, progress } : f)))
        }

        // Process with AI
        const aiResult = await processWithAI(file.content, file.name)

        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "completed",
                  extractedData: aiResult,
                  qualityScore: Math.floor(Math.random() * 40) + 60, // Mock quality score
                  qualityLevel: ["Excellent", "Good", "Fair", "Poor"][Math.floor(Math.random() * 4)] as any,
                }
              : f,
          ),
        )

        toast.success(`${file.name} processed successfully`)
      } catch (error) {
        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: "error" } : f)))
        toast.error(`Failed to process ${file.name}`)
      }
    })
  }, [])

  const handleUrlScrape = useCallback(async () => {
    if (!urlInput.trim()) return

    const fileId = `url-${Date.now()}`
    const newFile: UploadedFile = {
      id: fileId,
      name: `Scraped from ${urlInput}`,
      size: 0,
      type: "text/html",
      content: "",
      status: "processing",
      progress: 0,
      uploadedAt: new Date(),
    }

    setFiles((prev) => [...prev, newFile])

    try {
      // Simulate scraping
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const mockContent = `Content scraped from ${urlInput}\n\nThis is simulated content for demonstration purposes. In a real implementation, this would contain the actual scraped content from the webpage.`
      const aiResult = await processWithAI(mockContent, `Scraped from ${urlInput}`)

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                content: mockContent,
                status: "completed",
                size: mockContent.length,
                progress: 100,
                extractedData: aiResult,
                qualityScore: Math.floor(Math.random() * 40) + 60,
                qualityLevel: ["Excellent", "Good", "Fair", "Poor"][Math.floor(Math.random() * 4)] as any,
              }
            : f,
        ),
      )

      toast.success("URL content scraped successfully")
      setUrlInput("")
    } catch (error) {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "error" } : f)))
      toast.error("Failed to scrape URL")
    }
  }, [urlInput])

  const deleteFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    setSelectedFiles((prev) => {
      const newSet = new Set(prev)
      newSet.delete(fileId)
      return newSet
    })
    toast.success("File deleted")
  }, [])

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }, [])

  const selectFilteredFiles = useCallback(() => {
    const filteredFiles = files.filter((file) => {
      if (qualityFilter === "all") return true
      return file.qualityLevel === qualityFilter
    })
    setSelectedFiles(new Set(filteredFiles.map((f) => f.id)))
  }, [files, qualityFilter])

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set())
  }, [])

  const deleteSelectedFiles = useCallback(() => {
    setFiles((prev) => prev.filter((f) => !selectedFiles.has(f.id)))
    setSelectedFiles(new Set())
    toast.success(`${selectedFiles.size} files deleted`)
  }, [selectedFiles])

  const filteredFiles = files.filter((file) => {
    if (qualityFilter === "all") return true
    return file.qualityLevel === qualityFilter
  })

  const getQualityBadgeColor = (level?: string) => {
    switch (level) {
      case "Excellent":
        return "bg-green-100 text-green-800"
      case "Good":
        return "bg-blue-100 text-blue-800"
      case "Fair":
        return "bg-yellow-100 text-yellow-800"
      case "Poor":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Show loading spinner while checking authentication
  const loadingSpinner = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )

  // Show sign-in prompt if not authenticated
  const signInPrompt = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>Please sign in to access the Data Ingestion Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => (window.location.href = "/auth/signin")}>
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  // Main authenticated portal UI
  const mainPortalUI = (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Data Ingestion Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <DatabaseStatus />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome, {session?.user?.name || session?.user?.email || "User"}
          </h2>
          <p className="text-gray-600">Upload documents, scrape URLs, and process data with AI analysis</p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    File Upload
                  </CardTitle>
                  <CardDescription>Upload documents for AI processing and analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-4">Drag and drop files here, or click to select</p>
                    <p className="text-xs text-gray-500 mb-4">Supported: {ALLOWED_FILE_TYPES.join(", ")}</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ALLOWED_FILE_TYPES.join(",")}
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="hidden"
                    />
                    <Button onClick={() => fileInputRef.current?.click()}>Select Files</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    URL Scraping
                  </CardTitle>
                  <CardDescription>Extract content from web pages for analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">Website URL</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleUrlScrape} className="w-full">
                    Scrape Content
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="review" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>File Review</CardTitle>
                <CardDescription>Review and manage uploaded files with quality scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <Select value={qualityFilter} onValueChange={setQualityFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Quality</SelectItem>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="outline" onClick={selectFilteredFiles}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Select Filtered
                  </Button>

                  <Button variant="outline" onClick={clearSelection}>
                    <Square className="h-4 w-4 mr-2" />
                    Clear
                  </Button>

                  {selectedFiles.size > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected ({selectedFiles.size})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Files</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedFiles.size} selected files? This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={deleteSelectedFiles}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFiles(new Set(filteredFiles.map((f) => f.id)))
                              } else {
                                setSelectedFiles(new Set())
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedFiles.has(file.id)}
                              onCheckedChange={() => toggleFileSelection(file.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{file.name}</span>
                              {file.isDuplicate && (
                                <Badge variant="secondary" className="w-fit mt-1">
                                  Duplicate
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col space-y-1">
                              <Badge
                                variant={
                                  file.status === "completed"
                                    ? "default"
                                    : file.status === "error"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {file.status}
                              </Badge>
                              {file.status === "processing" && <Progress value={file.progress} className="w-20" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            {file.qualityLevel && (
                              <div className="flex flex-col space-y-1">
                                <Badge className={getQualityBadgeColor(file.qualityLevel)}>{file.qualityLevel}</Badge>
                                {file.qualityScore && (
                                  <span className="text-xs text-gray-500">{file.qualityScore}/100</span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{(file.size / 1024).toFixed(1)} KB</TableCell>
                          <TableCell>{file.uploadedAt.toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteFile(file.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <DataViewer />
          </TabsContent>

          <TabsContent value="metrics">
            <DataQualityMetrics />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Training Settings
                </CardTitle>
                <CardDescription>Configure AI model training and processing parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Training Frequency</Label>
                  <Select value={trainingFrequency} onValueChange={setTrainingFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Training Notes</Label>
                  <Textarea id="notes" placeholder="Add notes about training configuration..." rows={3} />
                </div>

                <Button>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )

  return (
    <>
      {status === "loading" && loadingSpinner}
      {status === "unauthenticated" || !session ? signInPrompt : mainPortalUI}
    </>
  )
}
