"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Upload,
  Link,
  Calendar,
  Database,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  RefreshCw,
  X,
  Square,
  CheckSquare,
  Eye,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase, type ProcessedData } from "@/lib/supabase"
import { processVeterinaryContent } from "@/lib/ai-processing"
import { customDuplicateCheck } from "@/lib/duplicate-detection"
import { DatabaseStatus } from "@/components/database-status"
import { DataQualityMetrics } from "@/components/data-quality-metrics"

// Veterinary-specific labels
const PREDEFINED_LABELS = [
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
]

interface UploadStatus {
  filename: string
  status: "pending" | "processing" | "success" | "error" | "duplicate"
  progress: number
  message?: string
}

export default function DataIngestionPortal() {
  const [processedData, setProcessedData] = useState<ProcessedData[]>([])
  const [selectedData, setSelectedData] = useState<ProcessedData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [useLocalStorage, setUseLocalStorage] = useState(false)
  const [activeTab, setActiveTab] = useState("upload")

  // New state for multiple file uploads
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // New state for multi-select functionality
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [isBulkOperating, setIsBulkOperating] = useState(false)

  useEffect(() => {
    loadProcessedData()
  }, [])

  const loadProcessedData = async () => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.log("Supabase not configured, using local storage")
        setUseLocalStorage(true)
        loadFromLocalStorage()
        return
      }

      const { data, error } = await supabase
        .from("processed_data")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setProcessedData(data || [])
    } catch (err) {
      console.error("Error loading data from Supabase, falling back to local storage:", err)
      setUseLocalStorage(true)
      loadFromLocalStorage()
    } finally {
      setIsLoading(false)
    }
  }

  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem("processed_data")
      if (stored) {
        setProcessedData(JSON.parse(stored))
      }
    } catch (err) {
      console.error("Error loading from local storage:", err)
    }
  }

  const saveToLocalStorage = (data: ProcessedData[]) => {
    try {
      localStorage.setItem("processed_data", JSON.stringify(data))
    } catch (err) {
      console.error("Error saving to local storage:", err)
    }
  }

  // Updated checkDuplicate function that uses our new modular system
  const checkDuplicate = async (
    name: string,
    content: string,
  ): Promise<{ isDuplicate: boolean; existingFile?: string; reason?: string }> => {
    if (useLocalStorage) {
      // Use our custom duplicate detection for local storage with more lenient settings
      const result = await customDuplicateCheck(name, content, processedData, {
        checkName: false, // Disable strict name checking
        checkContent: true,
        contentThreshold: 0.9, // Only block very similar content
        caseSensitive: false,
      })

      return {
        isDuplicate: result.isDuplicate,
        existingFile: result.existingFile,
        reason: result.reason,
      }
    }

    try {
      // For database, use exact name match only
      const { data, error } = await supabase
        .from("processed_data")
        .select("name")
        .eq("name", name.trim()) // Use exact match instead of ilike
        .single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      return {
        isDuplicate: !!data,
        existingFile: data?.name,
        reason: data ? "Exact filename already exists in database" : undefined,
      }
    } catch (err) {
      console.error("Error checking duplicate, falling back to local check:", err)

      // Fallback to our custom check with lenient settings
      const result = await customDuplicateCheck(name, content, processedData, {
        checkName: false, // Disable name checking in fallback
        checkContent: false, // Skip content check in fallback for performance
      })

      return {
        isDuplicate: false, // Be lenient in fallback
        existingFile: undefined,
        reason: undefined,
      }
    }
  }

  const processContent = async (
    content: string,
    name: string,
    type: string,
    source: "upload" | "url",
    statusIndex?: number,
  ) => {
    if (statusIndex !== undefined) {
      setUploadStatuses((prev) =>
        prev.map((status, i) =>
          i === statusIndex
            ? { ...status, status: "processing", progress: 10, message: "Checking for duplicates..." }
            : status,
        ),
      )
    }

    // Make duplicate check less strict for filename matching
    const { isDuplicate, existingFile, reason } = await checkDuplicate(name, content)

    if (isDuplicate) {
      const errorMsg = `Duplicate detected: "${name}" ${reason || `matches "${existingFile}"`}`

      if (statusIndex !== undefined) {
        setUploadStatuses((prev) =>
          prev.map((status, i) =>
            i === statusIndex ? { ...status, status: "duplicate", progress: 0, message: errorMsg } : status,
          ),
        )
      } else {
        setError(errorMsg)
      }
      return false
    }

    try {
      if (statusIndex !== undefined) {
        setUploadStatuses((prev) =>
          prev.map((status, i) =>
            i === statusIndex ? { ...status, progress: 25, message: "Reading file content..." } : status,
          ),
        )
      }
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (statusIndex !== undefined) {
        setUploadStatuses((prev) =>
          prev.map((status, i) =>
            i === statusIndex ? { ...status, progress: 50, message: "Analyzing veterinary content..." } : status,
          ),
        )
      }
      const extractedData = await processVeterinaryContent(content, name)

      if (statusIndex !== undefined) {
        setUploadStatuses((prev) =>
          prev.map((status, i) =>
            i === statusIndex ? { ...status, progress: 75, message: "Preparing data for storage..." } : status,
          ),
        )
      }
      const processedContent = content.slice(0, 1000) + (content.length > 1000 ? "..." : "")

      // Create unique ID - let Supabase generate UUID for database, use timestamp for local
      const newData: ProcessedData = {
        id: useLocalStorage ? `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : crypto.randomUUID(),
        name,
        type: type as ProcessedData["type"],
        source,
        original_content: content,
        processed_content: processedContent,
        extracted_data: extractedData,
        labels: [],
        status: "ready" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (useLocalStorage) {
        // Update state immediately and save to localStorage
        setProcessedData((prev) => {
          const updatedData = [newData, ...prev]
          saveToLocalStorage(updatedData)
          return updatedData
        })
        if (!statusIndex) setSelectedData(newData)
      } else {
        try {
          // Don't include ID in insert - let Supabase generate it
          const { id, ...dataWithoutId } = newData
          const { data: savedData, error } = await supabase
            .from("processed_data")
            .insert([dataWithoutId])
            .select()
            .single()

          if (error) throw error

          // Update state with the saved data
          setProcessedData((prev) => [savedData, ...prev])
          if (!statusIndex) setSelectedData(savedData)
        } catch (dbError) {
          console.error("Database save failed, saving locally:", dbError)
          setUseLocalStorage(true)
          setProcessedData((prev) => {
            const updatedData = [newData, ...prev]
            saveToLocalStorage(updatedData)
            return updatedData
          })
          if (!statusIndex) setSelectedData(newData)
        }
      }

      if (statusIndex !== undefined) {
        setUploadStatuses((prev) =>
          prev.map((status, i) =>
            i === statusIndex
              ? { ...status, status: "success", progress: 100, message: "Successfully processed!" }
              : status,
          ),
        )
      } else {
        setSuccess(`Successfully processed "${name}"`)
      }

      return true
    } catch (err) {
      console.error("Processing error:", err)
      const errorMsg = "Failed to process content"

      if (statusIndex !== undefined) {
        setUploadStatuses((prev) =>
          prev.map((status, i) =>
            i === statusIndex ? { ...status, status: "error", progress: 0, message: errorMsg } : status,
          ),
        )
      } else {
        setError(errorMsg)
      }
      return false
    }
  }

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (!files || files.length === 0) return

      const fileArray = Array.from(files)

      const initialStatuses: UploadStatus[] = fileArray.map((file) => ({
        filename: file.name,
        status: "pending",
        progress: 0,
      }))

      setUploadStatuses(initialStatuses)
      setIsUploading(true)
      setError("")
      setSuccess("")

      // Enable multi-select mode if multiple files are uploaded
      if (fileArray.length > 1) {
        setIsMultiSelectMode(true)
      }

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]

        const allowedTypes = [
          "text/plain",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/markdown",
        ]

        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|pdf|doc|docx|md)$/i)) {
          setUploadStatuses((prev) =>
            prev.map((status, index) =>
              index === i ? { ...status, status: "error", message: "Unsupported file type" } : status,
            ),
          )
          continue
        }

        try {
          let content = ""

          if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
            content = await file.text()
          } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            content = `PDF Content from ${file.name}\n\nThis is simulated content extracted from the PDF file. In a real implementation, this would contain the actual text content extracted from the PDF using libraries like pdf-parse or PDF.js.\n\nThe file appears to be a veterinary document based on the filename. The content would include medical terminology, case studies, treatment protocols, and research findings relevant to veterinary medicine.`
          } else {
            content = `Document Content from ${file.name}\n\nThis is simulated content extracted from the Word document. In a real implementation, this would contain the actual text content extracted from the document using libraries like mammoth.js or docx-parser.\n\nThe document appears to contain veterinary research or clinical information based on the filename.`
          }

          const name = file.name.replace(/\.[^/.]+$/, "")

          let detectedType = "other"
          const lowerContent = content.toLowerCase()
          const lowerName = file.name.toLowerCase()

          if (
            lowerContent.includes("veterinary") ||
            lowerContent.includes("animal") ||
            lowerName.includes("vet") ||
            lowerName.includes("animal")
          ) {
            if (lowerContent.includes("journal") || lowerName.includes("journal")) {
              detectedType = "veterinary-journal"
            } else if (lowerContent.includes("clinical") || lowerContent.includes("study")) {
              detectedType = "clinical-study"
            } else if (lowerContent.includes("case") && lowerContent.includes("report")) {
              detectedType = "case-report"
            } else {
              detectedType = "research-paper"
            }
          }

          await processContent(content, name, detectedType, "upload", i)
        } catch (err) {
          console.error("File upload error:", err)
          setUploadStatuses((prev) =>
            prev.map((status, index) =>
              index === i ? { ...status, status: "error", message: "Failed to read file" } : status,
            ),
          )
        }
      }

      setIsUploading(false)

      // Show summary - fix the status checking
      setTimeout(() => {
        setUploadStatuses((currentStatuses) => {
          const successful = currentStatuses.filter((status) => status.status === "success").length
          const duplicates = currentStatuses.filter((status) => status.status === "duplicate").length
          const errors = currentStatuses.filter((status) => status.status === "error").length

          if (successful > 0) {
            setSuccess(
              `Successfully processed ${successful} file(s)${duplicates > 0 ? `, ${duplicates} duplicate(s) skipped` : ""}${errors > 0 ? `, ${errors} error(s)` : ""}`,
            )
          }
          return currentStatuses
        })
      }, 1000) // Give time for all status updates to complete
    },
    [processedData, useLocalStorage],
  )

  const clearUploadStatuses = () => {
    setUploadStatuses([])
  }

  const handleUrlSubmit = async () => {
    if (!url.trim()) return

    setIsProcessing(true)
    try {
      const urlName = new URL(url).hostname + new URL(url).pathname.replace(/\//g, "-")
      const mockContent = `Content scraped from ${url}\n\nThis is simulated scraped content that would be extracted from the provided URL. In a real implementation, this would contain the actual scraped and cleaned text content from the veterinary website or journal.\n\nThe content would include veterinary research, clinical findings, treatment protocols, and other relevant information for training purposes.`

      await processContent(mockContent, urlName, "other", "url")
      setUrl("")
    } catch (err) {
      setError("Invalid URL provided")
    } finally {
      setIsProcessing(false)
    }
  }

  // Multi-select functions
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  const selectAllFiles = () => {
    const readyFiles = processedData.filter((data) => data.status === "ready").map((data) => data.id)
    setSelectedFiles(new Set(readyFiles))
  }

  const clearSelection = () => {
    setSelectedFiles(new Set())
  }

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode)
    if (isMultiSelectMode) {
      clearSelection()
    }
  }

  // Bulk operations
  const bulkUpdateStatus = async (status: ProcessedData["status"]) => {
    if (selectedFiles.size === 0) return

    setIsBulkOperating(true)
    try {
      const selectedIds = Array.from(selectedFiles)

      if (useLocalStorage) {
        const updatedData = processedData.map((data) => (selectedIds.includes(data.id) ? { ...data, status } : data))
        setProcessedData(updatedData)
        saveToLocalStorage(updatedData)
      } else {
        const { error } = await supabase.from("processed_data").update({ status }).in("id", selectedIds)

        if (error) throw error

        setProcessedData((prev) => prev.map((data) => (selectedIds.includes(data.id) ? { ...data, status } : data)))
      }

      setSuccess(`Successfully ${status} ${selectedFiles.size} file(s)`)
      clearSelection()
    } catch (err) {
      console.error("Bulk operation failed:", err)
      setError(`Failed to ${status} selected files`)
    } finally {
      setIsBulkOperating(false)
    }
  }

  const bulkUpdateLabels = async (labels: string[]) => {
    if (selectedFiles.size === 0) return

    setIsBulkOperating(true)
    try {
      const selectedIds = Array.from(selectedFiles)

      if (useLocalStorage) {
        const updatedData = processedData.map((data) => (selectedIds.includes(data.id) ? { ...data, labels } : data))
        setProcessedData(updatedData)
        saveToLocalStorage(updatedData)
      } else {
        const { error } = await supabase.from("processed_data").update({ labels }).in("id", selectedIds)

        if (error) throw error

        setProcessedData((prev) => prev.map((data) => (selectedIds.includes(data.id) ? { ...data, labels } : data)))
      }

      setSuccess(`Successfully updated labels for ${selectedFiles.size} file(s)`)
    } catch (err) {
      console.error("Bulk label update failed:", err)
      setError("Failed to update labels for selected files")
    } finally {
      setIsBulkOperating(false)
    }
  }

  const updateDataLabels = async (dataId: string, labels: string[]) => {
    try {
      if (useLocalStorage) {
        const updatedData = processedData.map((data) => (data.id === dataId ? { ...data, labels } : data))
        setProcessedData(updatedData)
        saveToLocalStorage(updatedData)
      } else {
        const { error } = await supabase.from("processed_data").update({ labels }).eq("id", dataId)
        if (error) throw error
        setProcessedData((prev) => prev.map((data) => (data.id === dataId ? { ...data, labels } : data)))
      }

      if (selectedData?.id === dataId) {
        setSelectedData((prev) => (prev ? { ...prev, labels } : null))
      }
    } catch (err) {
      console.error("Failed to update labels:", err)
      setError("Failed to update labels")
    }
  }

  const updateDataStatus = async (dataId: string, status: ProcessedData["status"]) => {
    try {
      if (useLocalStorage) {
        const updatedData = processedData.map((data) => (data.id === dataId ? { ...data, status } : data))
        setProcessedData(updatedData)
        saveToLocalStorage(updatedData)
      } else {
        const { error } = await supabase.from("processed_data").update({ status }).eq("id", dataId)
        if (error) throw error
        setProcessedData((prev) => prev.map((data) => (data.id === dataId ? { ...data, status } : data)))
      }

      if (selectedData?.id === dataId) {
        setSelectedData((prev) => (prev ? { ...prev, status } : null))
      }
      setSuccess(`Data ${status} successfully`)
    } catch (err) {
      console.error("Failed to update status:", err)
      setError("Failed to update status")
    }
  }

  const trainingSchedule = {
    frequency: "Monthly",
    nextTraining: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    lastTraining: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    dataCount: processedData.filter((d) => d.status === "approved").length,
  }

  const readyFiles = processedData.filter((data) => data.status === "ready")

  // Add this helper function after the existing helper functions
  const calculateDocumentQualityScore = (doc: ProcessedData): number => {
    let score = 0

    // Content length (0-30 points)
    const contentLength = doc.original_content.length
    if (contentLength > 2000) score += 30
    else if (contentLength > 1000) score += 20
    else if (contentLength > 500) score += 15
    else if (contentLength > 200) score += 10
    else score += 5

    // Extracted data quality (0-30 points)
    if (doc.extracted_data.title && doc.extracted_data.title.length > 10) score += 10
    if (doc.extracted_data.summary && doc.extracted_data.summary.length > 50) score += 10
    if (doc.extracted_data.keyPoints && doc.extracted_data.keyPoints.length >= 3) score += 10

    // Labels (0-20 points)
    if (doc.labels.length >= 3) score += 20
    else if (doc.labels.length >= 2) score += 15
    else if (doc.labels.length >= 1) score += 10

    // Veterinary relevance (0-20 points)
    const vetTerms = ["veterinary", "animal", "clinical", "diagnosis", "treatment", "therapy", "pathology"]
    const lowerContent = doc.original_content.toLowerCase()
    const relevantTerms = vetTerms.filter((term) => lowerContent.includes(term))
    score += Math.min(relevantTerms.length * 3, 20)

    return Math.min(score, 100)
  }

  const getQualityBadgeVariant = (score: number) => {
    if (score >= 80) return { variant: "default" as const, color: "text-green-600" }
    if (score >= 60) return { variant: "secondary" as const, color: "text-yellow-600" }
    if (score >= 40) return { variant: "outline" as const, color: "text-orange-600" }
    return { variant: "destructive" as const, color: "text-red-600" }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading data from database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Veterinary Data Ingestion Portal</h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Upload veterinary journals and research papers to process and prepare data for training
            </p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${useLocalStorage ? "bg-yellow-500" : "bg-green-500"}`}></div>
              <span className="text-sm text-gray-500">{useLocalStorage ? "Local Storage" : "Database Connected"}</span>
            </div>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Data Upload
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Quality Metrics
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Review & Approve
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            {/* Database Status and Training Schedule */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DatabaseStatus />

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Training Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600">Frequency</p>
                        <p className="font-semibold">{trainingSchedule.frequency}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm text-gray-600">Next Training</p>
                        <p className="font-semibold">{trainingSchedule.nextTraining.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm text-gray-600">Approved Data</p>
                        <p className="font-semibold">{trainingSchedule.dataCount} items</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-600">Last Training</p>
                        <p className="font-semibold">{trainingSchedule.lastTraining.toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upload Interface */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Data Input
                </CardTitle>
                <CardDescription>Upload veterinary files or provide URLs to scrape and process content</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">File Upload</TabsTrigger>
                    <TabsTrigger value="url">URL Input</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-4">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                      onDrop={(e) => {
                        e.preventDefault()
                        handleFileUpload(e.dataTransfer.files)
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => document.getElementById("file-input")?.click()}
                    >
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        Drop veterinary files here or click to upload
                      </p>
                      <p className="text-sm text-gray-500">Supports TXT, PDF, DOC files • Multiple files supported</p>
                      <input
                        id="file-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                        accept=".txt,.pdf,.doc,.docx,.md"
                        multiple
                      />
                    </div>

                    {/* Upload Progress */}
                    {uploadStatuses.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Upload Progress</CardTitle>
                            <Button variant="ghost" size="sm" onClick={clearUploadStatuses}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {uploadStatuses.map((status, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="truncate">{status.filename}</span>
                                <Badge
                                  variant={
                                    status.status === "success"
                                      ? "default"
                                      : status.status === "error"
                                        ? "destructive"
                                        : status.status === "duplicate"
                                          ? "secondary"
                                          : "outline"
                                  }
                                >
                                  {status.status}
                                </Badge>
                              </div>
                              {status.status === "processing" && (
                                <div className="space-y-1">
                                  <Progress value={status.progress} className="h-2" />
                                  <p className="text-xs text-gray-500">{status.message}</p>
                                </div>
                              )}
                              {status.message && status.status !== "processing" && (
                                <p className="text-xs text-gray-500">{status.message}</p>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="url" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="url-input">Website URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="url-input"
                          type="url"
                          placeholder="https://veterinaryjournal.com/article"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                        />
                        <Button onClick={handleUrlSubmit} disabled={!url.trim() || isProcessing}>
                          <Link className="h-4 w-4 mr-2" />
                          Scrape
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {error && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mt-4 border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quality Metrics Tab */}
          <TabsContent value="quality">
            <DataQualityMetrics />
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Processed Data List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Processed Data ({processedData.length})
                    <Button variant="outline" size="sm" onClick={loadProcessedData} className="ml-auto bg-transparent">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  {readyFiles.length > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={toggleMultiSelectMode}
                          className={isMultiSelectMode ? "bg-blue-50 border-blue-200" : ""}
                        >
                          {isMultiSelectMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          Multi-Select
                        </Button>
                        {isMultiSelectMode && (
                          <>
                            <Button variant="ghost" size="sm" onClick={selectAllFiles}>
                              Select All Ready
                            </Button>
                            <Button variant="ghost" size="sm" onClick={clearSelection}>
                              Clear
                            </Button>
                          </>
                        )}
                      </div>
                      {selectedFiles.size > 0 && <Badge variant="secondary">{selectedFiles.size} selected</Badge>}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {processedData.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No data processed yet</p>
                    ) : (
                      processedData.map((data) => (
                        <div
                          key={data.id}
                          className={`p-3 border rounded-lg transition-colors ${
                            selectedData?.id === data.id
                              ? "border-blue-500 bg-blue-50"
                              : selectedFiles.has(data.id)
                                ? "border-green-500 bg-green-50"
                                : "border-gray-200 hover:border-gray-300"
                          } ${isMultiSelectMode && data.status === "ready" ? "cursor-pointer" : ""}`}
                          onClick={() => {
                            if (isMultiSelectMode && data.status === "ready") {
                              toggleFileSelection(data.id)
                            } else if (!isMultiSelectMode) {
                              setSelectedData(data)
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isMultiSelectMode && data.status === "ready" && (
                                <Checkbox
                                  checked={selectedFiles.has(data.id)}
                                  onChange={() => toggleFileSelection(data.id)}
                                />
                              )}
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="font-medium truncate">{data.name}</span>
                              {!isMultiSelectMode && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedData(data)
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <Badge
                              variant={
                                data.status === "approved"
                                  ? "default"
                                  : data.status === "ready"
                                    ? "secondary"
                                    : data.status === "processing"
                                      ? "outline"
                                      : "destructive"
                              }
                            >
                              {data.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {data.type.replace("-", " ")}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {data.source}
                            </Badge>
                            <Badge {...getQualityBadgeVariant(calculateDocumentQualityScore(data))} className="text-xs">
                              Q: {calculateDocumentQualityScore(data)}%
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(data.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Review Panel */}
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {selectedFiles.size > 0 ? `Bulk Operations (${selectedFiles.size} selected)` : "Data Review"}
                  </CardTitle>
                  <CardDescription>
                    {selectedFiles.size > 0
                      ? "Apply actions to multiple selected files"
                      : "Review and approve processed veterinary content before training"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedFiles.size > 0 ? (
                    /* Bulk Operations Panel */
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">Selected Files ({selectedFiles.size})</h3>
                        <div className="bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                          {Array.from(selectedFiles).map((fileId) => {
                            const file = processedData.find((d) => d.id === fileId)
                            return (
                              <div key={fileId} className="text-sm py-1">
                                • {file?.name}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Bulk Label Assignment */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Assign Labels to All Selected</Label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {PREDEFINED_LABELS.map((label) => (
                            <Badge
                              key={label}
                              variant="outline"
                              className="cursor-pointer hover:bg-gray-100"
                              onClick={() => bulkUpdateLabels([label])}
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Bulk Actions */}
                      <div className="space-y-3">
                        <h3 className="font-semibold">Bulk Actions</h3>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => bulkUpdateStatus("approved")}
                            disabled={isBulkOperating}
                            className="flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve All
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => bulkUpdateStatus("rejected")}
                            disabled={isBulkOperating}
                            className="flex-1"
                          >
                            Reject All
                          </Button>
                        </div>
                        <Button variant="ghost" onClick={clearSelection} disabled={isBulkOperating} className="w-full">
                          Clear Selection
                        </Button>
                      </div>

                      {isBulkOperating && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          Processing bulk operation...
                        </div>
                      )}
                    </div>
                  ) : !selectedData ? (
                    /* No Selection State */
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {isMultiSelectMode
                          ? "Select multiple files to perform bulk operations"
                          : "Select processed data to review"}
                      </p>
                    </div>
                  ) : (
                    /* Single File Review */
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">Extracted Information</h3>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-medium">Title</Label>
                            <p className="text-sm bg-gray-50 p-2 rounded">{selectedData.extracted_data.title}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Summary</Label>
                            <p className="text-sm bg-gray-50 p-2 rounded">{selectedData.extracted_data.summary}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Key Points</Label>
                            <ul className="text-sm bg-gray-50 p-2 rounded space-y-1">
                              {selectedData.extracted_data.keyPoints.map((point, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-gray-400">•</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Metadata</Label>
                            <div className="bg-gray-50 p-2 rounded space-y-1">
                              {Object.entries(selectedData.extracted_data.metadata).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-sm">
                                  <span className="font-medium">{key}:</span>
                                  <span>{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Assign Veterinary Labels</Label>
                        <div className="flex flex-wrap gap-2">
                          {PREDEFINED_LABELS.map((label) => (
                            <Badge
                              key={label}
                              variant={selectedData.labels.includes(label) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                const newLabels = selectedData.labels.includes(label)
                                  ? selectedData.labels.filter((l) => l !== label)
                                  : [...selectedData.labels, label]
                                updateDataLabels(selectedData.id, newLabels)
                              }}
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Processed Content Preview</Label>
                        <Textarea value={selectedData.processed_content} readOnly className="min-h-32 text-sm" />
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => updateDataStatus(selectedData.id, "approved")}
                          disabled={selectedData.status === "approved"}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => updateDataStatus(selectedData.id, "rejected")}
                          disabled={selectedData.status === "rejected"}
                          className="flex-1"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
