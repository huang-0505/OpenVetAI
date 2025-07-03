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

  // Add after existing state declarations
  const [qualityFilter, setQualityFilter] = useState<string>("all")

  // Quality score calculation function (improved and more realistic)
  const calculateQualityScore = (content: string, extractedData: any, labels: string[]): number => {
    let score = 0

    // Content length score (0-25 points) - more lenient
    const contentLength = content.length
    if (contentLength > 1500) score += 25
    else if (contentLength > 800) score += 20
    else if (contentLength > 400) score += 15
    else if (contentLength > 200) score += 10
    else score += 5

    // Extracted data quality (0-25 points) - check for meaningful content
    if (extractedData.title && extractedData.title.length > 20) score += 8
    else if (extractedData.title && extractedData.title.length > 10) score += 5

    if (extractedData.summary && extractedData.summary.length > 100) score += 8
    else if (extractedData.summary && extractedData.summary.length > 50) score += 5

    if (extractedData.keyPoints && extractedData.keyPoints.length >= 4) score += 9
    else if (extractedData.keyPoints && extractedData.keyPoints.length >= 2) score += 6
    else if (extractedData.keyPoints && extractedData.keyPoints.length >= 1) score += 3

    // Labels score (0-20 points) - more forgiving for new documents
    if (labels.length >= 3) score += 20
    else if (labels.length >= 2) score += 15
    else if (labels.length >= 1) score += 10
    else score += 5 // Give some points even without labels

    // Veterinary relevance (0-30 points) - enhanced detection
    const vetTerms = [
      "veterinary",
      "animal",
      "clinical",
      "diagnosis",
      "treatment",
      "therapy",
      "pathology",
      "surgery",
      "medicine",
      "patient",
      "canine",
      "feline",
      "equine",
      "bovine",
      "small animal",
      "large animal",
      "medical",
      "health",
      "disease",
      "infection",
      "medication",
      "procedure",
      "examination",
    ]
    const lowerContent = content.toLowerCase()
    const relevantTerms = vetTerms.filter((term) => lowerContent.includes(term))

    // More generous scoring for veterinary relevance
    if (relevantTerms.length >= 8) score += 30
    else if (relevantTerms.length >= 5) score += 25
    else if (relevantTerms.length >= 3) score += 20
    else if (relevantTerms.length >= 1) score += 15
    else score += 5 // Base score for any document

    return Math.min(score, 100)
  }

  // Get quality badge variant and label
  const getQualityBadge = (score: number) => {
    if (score >= 80) return { variant: "default" as const, label: "Excellent", color: "text-green-600" }
    if (score >= 60) return { variant: "secondary" as const, label: "Good", color: "text-yellow-600" }
    if (score >= 40) return { variant: "outline" as const, label: "Fair", color: "text-orange-600" }
    return { variant: "destructive" as const, label: "Poor", color: "text-red-600" }
  }

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
      // Calculate quality score with the extracted data
      const qualityScore = calculateQualityScore(content, extractedData, [])
      console.log(`Quality score for ${name}: ${qualityScore}`) // Debug log

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
        quality_score: qualityScore,
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

  const clearProcessedData = async () => {
    try {
      if (useLocalStorage) {
        localStorage.removeItem("processed_data")
        setProcessedData([])
      } else {
        // For database, we'll delete all records (be careful with this in production!)
        const { error } = await supabase
          .from("processed_data")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all records

        if (error) throw error
        setProcessedData([])
      }

      setSelectedData(null)
      setSelectedFiles(new Set())
      setSuccess("All processed data cleared successfully")
    } catch (err) {
      console.error("Error clearing data:", err)
      setError("Failed to clear processed data")
    }
  }

  const clearUploadStatuses = () => {
    setUploadStatuses([])
  }

  const clearSelectedData = async (dataId: string) => {
    try {
      if (useLocalStorage) {
        const updatedData = processedData.filter((data) => data.id !== dataId)
        setProcessedData(updatedData)
        saveToLocalStorage(updatedData)
      } else {
        const { error } = await supabase.from("processed_data").delete().eq("id", dataId)

        if (error) throw error
        setProcessedData((prev) => prev.filter((data) => data.id !== dataId))
      }

      if (selectedData?.id === dataId) {
        setSelectedData(null)
      }

      setSelectedFiles((prev) => {
        const newSet = new Set(prev)
        newSet.delete(dataId)
        return newSet
      })

      setSuccess("Document removed successfully")
    } catch (err) {
      console.error("Error removing document:", err)
      setError("Failed to remove document")
    }
  }

  const bulkClearSelected = async () => {
    if (selectedFiles.size === 0) return

    setIsBulkOperating(true)
    try {
      const selectedIds = Array.from(selectedFiles)

      if (useLocalStorage) {
        const updatedData = processedData.filter((data) => !selectedIds.includes(data.id))
        setProcessedData(updatedData)
        saveToLocalStorage(updatedData)
      } else {
        const { error } = await supabase.from("processed_data").delete().in("id", selectedIds)

        if (error) throw error
        setProcessedData((prev) => prev.filter((data) => !selectedIds.includes(data.id)))
      }

      setSuccess(`Successfully removed ${selectedFiles.size} document(s)`)
      clearSelection()
    } catch (err) {
      console.error("Bulk delete failed:", err)
      setError("Failed to remove selected documents")
    } finally {
      setIsBulkOperating(false)
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vet Data Ingestion Portal</h1>
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
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={loadProcessedData} className="bg-transparent">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      {processedData.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearProcessedData}
                          className="bg-transparent text-red-600 hover:text-red-700"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                  {/* Add this after the existing CardTitle and before the multi-select controls */}
                  <div className="flex items-center gap-2 pt-2">
                    <Label className="text-sm font-medium">Filter by Quality:</Label>
                    <select
                      value={qualityFilter}
                      onChange={(e) => setQualityFilter(e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="all">All Quality ({processedData.length})</option>
                      <option value="excellent">Excellent (80-100%)</option>
                      <option value="good">Good (60-79%)</option>
                      <option value="fair">Fair (40-59%)</option>
                      <option value="poor">Poor (0-39%)</option>
                    </select>
                  </div>
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
                    {/* Filter processed data based on quality */}
                    {processedData
                      .filter((data) => {
                        if (qualityFilter === "all") return true
                        // Recalculate score if not stored or if it's 0
                        const score =
                          data.quality_score ||
                          calculateQualityScore(data.original_content, data.extracted_data, data.labels)
                        if (qualityFilter === "excellent") return score >= 80
                        if (qualityFilter === "good") return score >= 60 && score < 80
                        if (qualityFilter === "fair") return score >= 40 && score < 60
                        if (qualityFilter === "poor") return score < 40
                        return true
                      })
                      .map((data) => (
                        <div
                          key={data.id}
                          className={`p-3 rounded-md border ${selectedData?.id === data.id ? "border-blue-500" : "border-gray-200"} ${
                            selectedFiles.has(data.id) ? "bg-blue-50" : ""
                          } hover:bg-gray-50 cursor-pointer flex items-center justify-between group`}
                        >
                          <div
                            className="flex items-center flex-1"
                            onClick={() => {
                              if (isMultiSelectMode) {
                                toggleFileSelection(data.id)
                              } else {
                                setSelectedData(data)
                              }
                            }}
                          >
                            {isMultiSelectMode && (
                              <Checkbox
                                checked={selectedFiles.has(data.id)}
                                onCheckedChange={() => toggleFileSelection(data.id)}
                                className="mr-2"
                              />
                            )}
                            <div className="truncate flex-1">
                              <p className="font-semibold text-sm">{data.name}</p>
                              <p className="text-xs text-gray-500">
                                {data.type} • {data.source}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getQualityBadge(data.quality_score || 0).variant}
                              className={getQualityBadge(data.quality_score || 0).color}
                            >
                              {getQualityBadge(data.quality_score || 0).label}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                clearSelectedData(data.id)
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Selected Data Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Data Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedData ? (
                    <>
                      <div className="space-y-2">
                        <Label>Filename</Label>
                        <Input type="text" value={selectedData.name} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Input type="text" value={selectedData.type} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Source</Label>
                        <Input type="text" value={selectedData.source} readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Original Content</Label>
                        <Textarea value={selectedData.original_content} readOnly className="h-24" />
                      </div>
                      <div className="space-y-2">
                        <Label>Processed Content</Label>
                        <Textarea value={selectedData.processed_content} readOnly className="h-24" />
                      </div>
                      <div className="space-y-2">
                        <Label>Extracted Data</Label>
                        <Textarea
                          value={JSON.stringify(selectedData.extracted_data, null, 2)}
                          readOnly
                          className="h-24"
                        />
                      </div>

                      {/* Labels Management */}
                      <div className="space-y-2">
                        <Label>Labels</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedData.labels.map((label) => (
                            <Badge key={label}>{label}</Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {PREDEFINED_LABELS.map((label) => (
                            <Button
                              key={label}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newLabels = selectedData.labels.includes(label)
                                  ? selectedData.labels.filter((l) => l !== label)
                                  : [...selectedData.labels, label]
                                updateDataLabels(selectedData.id, newLabels)
                              }}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Status Management */}
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={selectedData.status === "ready" ? "default" : "outline"}
                            onClick={() => updateDataStatus(selectedData.id, "ready")}
                          >
                            Ready
                          </Button>
                          <Button
                            variant={selectedData.status === "approved" ? "default" : "outline"}
                            onClick={() => updateDataStatus(selectedData.id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            variant={selectedData.status === "rejected" ? "default" : "outline"}
                            onClick={() => updateDataStatus(selectedData.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">Select a file to view details</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bulk Actions */}
            {isMultiSelectMode && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle>Bulk Actions</CardTitle>
                  <CardDescription>Perform actions on {selectedFiles.size} selected files</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block pb-2">Update Status</Label>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" disabled={isBulkOperating} onClick={() => bulkUpdateStatus("ready")}>
                        Set to Ready
                      </Button>
                      <Button variant="outline" disabled={isBulkOperating} onClick={() => bulkUpdateStatus("approved")}>
                        Approve
                      </Button>
                      <Button variant="outline" disabled={isBulkOperating} onClick={() => bulkUpdateStatus("rejected")}>
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        disabled={isBulkOperating}
                        onClick={bulkClearSelected}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                      >
                        Delete Selected
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="block pb-2">Update Labels</Label>
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_LABELS.slice(0, 6).map((label) => (
                        <Button
                          key={label}
                          variant="outline"
                          size="sm"
                          disabled={isBulkOperating}
                          onClick={() => {
                            bulkUpdateLabels([label])
                          }}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
