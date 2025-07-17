"use client"

import type React from "react"
import { useState, useCallback, useEffect } from "react"
import {
  Upload,
  FileText,
  Database,
  BarChart3,
  Filter,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Activity,
  Clock,
  MoreHorizontal,
  HelpCircle,
  Bell,
  PieChart,
  Grid,
  List,
  Sliders,
  HardDrive,
  Badge,
  Shield,
  UserCheck,
  UserX,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { DataViewer } from "./data-viewer"
import { DatabaseStatus } from "./database-status"
import { DataQualityMetrics } from "./data-quality-metrics"
import { UserMenu } from "./user-menu"
import { useUserRole } from "@/lib/auth-utils"

// Mock data for demonstration
const mockFiles = [
  {
    id: 1,
    name: "customer_data.csv",
    size: "2.3 MB",
    status: "processed",
    uploadDate: "2024-01-15",
    type: "CSV",
    records: 1250,
    duplicates: 23,
    qualityScore: 92,
    needsReview: false,
    uploadedBy: "john@example.com",
  },
  {
    id: 2,
    name: "research_paper_001.pdf",
    size: "5.7 MB",
    status: "pending_review",
    uploadDate: "2024-01-15",
    type: "PDF",
    records: 1,
    duplicates: 0,
    qualityScore: 88,
    needsReview: true,
    uploadedBy: "researcher@university.edu",
  },
  {
    id: 3,
    name: "clinical_study.json",
    size: "1.1 MB",
    status: "rejected",
    uploadDate: "2024-01-14",
    type: "JSON",
    records: 890,
    duplicates: 12,
    qualityScore: 76,
    needsReview: false,
    uploadedBy: "clinic@hospital.com",
  },
  {
    id: 4,
    name: "veterinary_journal.xml",
    size: "3.2 MB",
    status: "approved",
    uploadDate: "2024-01-14",
    type: "XML",
    records: 2100,
    duplicates: 45,
    qualityScore: 94,
    needsReview: false,
    uploadedBy: "vet@clinic.com",
  },
  {
    id: 5,
    name: "case_report.txt",
    size: "8.9 MB",
    status: "processing",
    uploadDate: "2024-01-13",
    type: "Text",
    records: 0,
    duplicates: 0,
    qualityScore: 0,
    needsReview: false,
    uploadedBy: "doctor@hospital.com",
  },
]

const mockMetrics = {
  totalFiles: 156,
  processedFiles: 142,
  failedFiles: 8,
  queuedFiles: 6,
  pendingReview: 12,
  totalRecords: 45230,
  duplicateRecords: 1240,
  averageQualityScore: 87,
  processingTime: "2.3 hours",
  storageUsed: "234 GB",
  apiCalls: 12450,
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}

export default function DataIngestionPortal() {
  const [mounted, setMounted] = useState(false)
  const [files, setFiles] = useState(mockFiles)
  const [selectedFiles, setSelectedFiles] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [sortBy, setSortBy] = useState("uploadDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [qualityThreshold, setQualityThreshold] = useState([80])
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [bulkAction, setBulkAction] = useState("")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [notifications, setNotifications] = useState(true)
  const [compactView, setCompactView] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("upload")
  const { toast } = useToast()
  const { isAdmin } = useUserRole()

  // Filter and sort files
  const filteredFiles = files
    .filter((file) => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === "all" || file.status === filterStatus
      const matchesType = filterType === "all" || file.type.toLowerCase() === filterType.toLowerCase()
      const matchesQuality = file.qualityScore >= qualityThreshold[0]

      let matchesDate = true
      if (dateRange.start && dateRange.end) {
        const fileDate = new Date(file.uploadDate)
        const startDate = new Date(dateRange.start)
        const endDate = new Date(dateRange.end)
        matchesDate = fileDate >= startDate && fileDate <= endDate
      }

      return matchesSearch && matchesStatus && matchesType && matchesQuality && matchesDate
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof typeof a]
      const bValue = b[sortBy as keyof typeof a]

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const uploadedFiles = event.target.files
      if (uploadedFiles) {
        setIsUploading(true)
        setUploadProgress(0)

        // Simulate upload progress
        const interval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 100) {
              clearInterval(interval)
              setIsUploading(false)

              // Add new files to the list
              const newFiles = Array.from(uploadedFiles).map((file, index) => ({
                id: files.length + index + 1,
                name: file.name,
                size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                status:
                  file.name.includes(".pdf") || file.name.includes("research") || file.name.includes("study")
                    ? ("pending_review" as const)
                    : ("processing" as const),
                uploadDate: new Date().toISOString().split("T")[0],
                type: file.name.split(".").pop()?.toUpperCase() || "Unknown",
                records: 0,
                duplicates: 0,
                qualityScore: 0,
                needsReview:
                  file.name.includes(".pdf") || file.name.includes("research") || file.name.includes("study"),
                uploadedBy: "current-user@example.com",
              }))

              setFiles((prev) => [...newFiles, ...prev])
              toast({
                title: "Upload Complete",
                description: `${uploadedFiles.length} file(s) uploaded successfully`,
              })

              return 0
            }
            return prev + 10
          })
        }, 200)
      }
    },
    [files.length, toast],
  )

  const handleBulkAction = useCallback(() => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to perform bulk actions",
        variant: "destructive",
      })
      return
    }

    // Check admin permissions for certain actions
    if ((bulkAction === "approve" || bulkAction === "reject") && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can approve or reject files",
        variant: "destructive",
      })
      return
    }

    switch (bulkAction) {
      case "delete":
        setFiles((prev) => prev.filter((file) => !selectedFiles.includes(file.id)))
        toast({
          title: "Files deleted",
          description: `${selectedFiles.length} file(s) deleted successfully`,
        })
        break
      case "approve":
        setFiles((prev) =>
          prev.map((file) =>
            selectedFiles.includes(file.id) ? { ...file, status: "approved" as const, needsReview: false } : file,
          ),
        )
        toast({
          title: "Files approved",
          description: `${selectedFiles.length} file(s) approved successfully`,
        })
        break
      case "reject":
        setFiles((prev) =>
          prev.map((file) =>
            selectedFiles.includes(file.id) ? { ...file, status: "rejected" as const, needsReview: false } : file,
          ),
        )
        toast({
          title: "Files rejected",
          description: `${selectedFiles.length} file(s) rejected`,
        })
        break
      case "reprocess":
        setFiles((prev) =>
          prev.map((file) => (selectedFiles.includes(file.id) ? { ...file, status: "processing" as const } : file)),
        )
        toast({
          title: "Files queued for reprocessing",
          description: `${selectedFiles.length} file(s) queued for reprocessing`,
        })
        break
      case "export":
        toast({
          title: "Export started",
          description: `Exporting ${selectedFiles.length} file(s)...`,
        })
        break
    }

    setSelectedFiles([])
    setBulkAction("")
  }, [selectedFiles, bulkAction, toast, isAdmin])

  const handleSelectAll = useCallback(() => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(filteredFiles.map((file) => file.id))
    }
  }, [selectedFiles.length, filteredFiles])

  const handleFileAction = useCallback(
    (fileId: number, action: string) => {
      // Check admin permissions for review actions
      if ((action === "approve" || action === "reject") && !isAdmin) {
        toast({
          title: "Access Denied",
          description: "Only administrators can approve or reject files",
          variant: "destructive",
        })
        return
      }

      switch (action) {
        case "delete":
          setFiles((prev) => prev.filter((file) => file.id !== fileId))
          toast({
            title: "File deleted",
            description: "File deleted successfully",
          })
          break
        case "approve":
          setFiles((prev) =>
            prev.map((file) =>
              file.id === fileId ? { ...file, status: "approved" as const, needsReview: false } : file,
            ),
          )
          toast({
            title: "File approved",
            description: "File approved successfully",
          })
          break
        case "reject":
          setFiles((prev) =>
            prev.map((file) =>
              file.id === fileId ? { ...file, status: "rejected" as const, needsReview: false } : file,
            ),
          )
          toast({
            title: "File rejected",
            description: "File rejected",
          })
          break
        case "reprocess":
          setFiles((prev) =>
            prev.map((file) => (file.id === fileId ? { ...file, status: "processing" as const } : file)),
          )
          toast({
            title: "File queued for reprocessing",
            description: "File queued for reprocessing",
          })
          break
        case "download":
          toast({
            title: "Download started",
            description: "File download started",
          })
          break
        case "preview":
          const file = files.find((f) => f.id === fileId)
          if (file) {
            setPreviewData({
              name: file.name,
              type: file.type,
              records: file.records,
              uploadedBy: file.uploadedBy,
              sample: [
                { id: 1, name: "John Doe", email: "john@example.com", status: "active" },
                { id: 2, name: "Jane Smith", email: "jane@example.com", status: "inactive" },
                { id: 3, name: "Bob Johnson", email: "bob@example.com", status: "active" },
              ],
            })
            setShowPreview(true)
          }
          break
      }
    },
    [files, toast, isAdmin],
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processed":
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "processing":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case "failed":
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending_review":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "queued":
        return <Clock className="h-4 w-4 text-gray-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      processed: "default",
      approved: "default",
      processing: "secondary",
      failed: "destructive",
      rejected: "destructive",
      pending_review: "outline",
      queued: "outline",
    } as const

    const labels = {
      processed: "Processed",
      approved: "Approved",
      processing: "Processing",
      failed: "Failed",
      rejected: "Rejected",
      pending_review: "Pending Review",
      queued: "Queued",
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const getQualityColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // Simulate data refresh
        setFiles((prev) =>
          prev.map((file) => ({
            ...file,
            // Randomly update processing files
            status:
              file.status === "processing" && Math.random() > 0.7
                ? ((Math.random() > 0.8 ? "failed" : "processed") as const)
                : file.status,
          })),
        )
      }, refreshInterval * 1000)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <LoadingSpinner />
  }

  // Get pending review count for admin
  const pendingReviewCount = files.filter((f) => f.status === "pending_review").length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Database className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Data Ingestion Portal</h1>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              v2.1.0
            </Badge>
            {isAdmin && (
              <Badge variant="outline" className="hidden sm:inline-flex">
                <Shield className="w-3 h-3 mr-1" />
                Admin Mode
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAdmin && pendingReviewCount > 0 && (
              <Button variant="ghost" size="sm" className="hidden md:inline-flex">
                <Bell className="h-4 w-4" />
                <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-xs">{pendingReviewCount}</Badge>
              </Button>
            )}
            <Button variant="ghost" size="sm" className="hidden md:inline-flex">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="files">
              Files
              {pendingReviewCount > 0 && isAdmin && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">{pendingReviewCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="h-5 w-5" />
                    <span>File Upload</span>
                  </CardTitle>
                  <CardDescription>
                    Upload your data files for processing and analysis
                    {!isAdmin && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <Lock className="inline w-3 h-3 mr-1" />
                        Research papers will require admin approval
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <div className="mt-4">
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-sm font-medium text-primary hover:text-primary/80">Click to upload</span>
                        <span className="text-sm text-muted-foreground"> or drag and drop</span>
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".csv,.xlsx,.json,.xml,.txt,.pdf"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supports CSV, Excel, JSON, XML, Text, and PDF files up to 100MB
                    </p>
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Quick Stats</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{mockMetrics.totalFiles}</div>
                      <div className="text-sm text-muted-foreground">Total Files</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{mockMetrics.processedFiles}</div>
                      <div className="text-sm text-muted-foreground">Processed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{mockMetrics.failedFiles}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {isAdmin ? mockMetrics.pendingReview : mockMetrics.queuedFiles}
                      </div>
                      <div className="text-sm text-muted-foreground">{isAdmin ? "Pending Review" : "Queued"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DatabaseStatus />
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-6">
            {/* Admin Review Alert */}
            {isAdmin && pendingReviewCount > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">{pendingReviewCount} file(s) pending your review</p>
                      <p className="text-sm text-yellow-700">
                        Research papers and studies require admin approval before processing.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters and Controls */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Filter className="h-5 w-5" />
                    <span>File Management</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode(viewMode === "table" ? "grid" : "table")}
                    >
                      {viewMode === "table" ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                      <Sliders className="h-4 w-4" />
                      {showAdvancedFilters ? "Hide" : "Show"} Filters
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showAdvancedFilters && (
                  <div className="grid gap-4 p-4 border rounded-lg bg-muted/50">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Quality Score Threshold: {qualityThreshold[0]}%</Label>
                        <Slider
                          value={qualityThreshold}
                          onValueChange={setQualityThreshold}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sort By</Label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="uploadDate">Upload Date</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="size">Size</SelectItem>
                            <SelectItem value="qualityScore">Quality Score</SelectItem>
                            <SelectItem value="records">Records</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={dateRange.start}
                          onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date">End Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={dateRange.end}
                          onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bulk Actions */}
                {selectedFiles.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                    <span className="text-sm font-medium">{selectedFiles.length} file(s) selected</span>
                    <div className="flex items-center space-x-2">
                      <Select value={bulkAction} onValueChange={setBulkAction}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Bulk actions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="delete">Delete</SelectItem>
                          <SelectItem value="reprocess">Reprocess</SelectItem>
                          <SelectItem value="export">Export</SelectItem>
                          {isAdmin && (
                            <>
                              <SelectItem value="approve">Approve</SelectItem>
                              <SelectItem value="reject">Reject</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleBulkAction} disabled={!bulkAction}>
                        Apply
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Files Table/Grid */}
            <Card>
              <CardContent className="p-0">
                {viewMode === "table" ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>Upload Date</TableHead>
                        {isAdmin && <TableHead>Uploaded By</TableHead>}
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedFiles.includes(file.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedFiles((prev) => [...prev, file.id])
                                } else {
                                  setSelectedFiles((prev) => prev.filter((id) => id !== file.id))
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span>{file.name}</span>
                              {file.needsReview && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Review
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{file.type}</Badge>
                          </TableCell>
                          <TableCell>{file.size}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(file.status)}
                              {getStatusBadge(file.status)}
                            </div>
                          </TableCell>
                          <TableCell>{file.records.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${getQualityColor(file.qualityScore)}`}>
                                {file.qualityScore}%
                              </span>
                              {file.duplicates > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {file.duplicates} dups
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{file.uploadDate}</TableCell>
                          {isAdmin && (
                            <TableCell className="text-xs text-muted-foreground">{file.uploadedBy}</TableCell>
                          )}
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleFileAction(file.id, "preview")}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleFileAction(file.id, "download")}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>
                                {isAdmin && file.status === "pending_review" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleFileAction(file.id, "approve")}>
                                      <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleFileAction(file.id, "reject")}>
                                      <UserX className="mr-2 h-4 w-4 text-red-600" />
                                      Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem onClick={() => handleFileAction(file.id, "reprocess")}>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reprocess
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleFileAction(file.id, "delete")}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredFiles.map((file) => (
                      <Card key={file.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={selectedFiles.includes(file.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedFiles((prev) => [...prev, file.id])
                                  } else {
                                    setSelectedFiles((prev) => prev.filter((id) => id !== file.id))
                                  }
                                }}
                              />
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleFileAction(file.id, "preview")}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleFileAction(file.id, "download")}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>
                                {isAdmin && file.status === "pending_review" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleFileAction(file.id, "approve")}>
                                      <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleFileAction(file.id, "reject")}>
                                      <UserX className="mr-2 h-4 w-4 text-red-600" />
                                      Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem onClick={() => handleFileAction(file.id, "reprocess")}>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reprocess
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleFileAction(file.id, "delete")}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <CardTitle className="text-sm font-medium truncate">{file.name}</CardTitle>
                          {file.needsReview && (
                            <Badge variant="outline" className="text-xs w-fit">
                              <Clock className="w-3 h-3 mr-1" />
                              Needs Review
                            </Badge>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <Badge variant="outline">{file.type}</Badge>
                            <span className="text-muted-foreground">{file.size}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(file.status)}
                            {getStatusBadge(file.status)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Records:</span>
                              <span>{file.records.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Quality:</span>
                              <span className={getQualityColor(file.qualityScore)}>{file.qualityScore}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Uploaded:</span>
                              <span>{file.uploadDate}</span>
                            </div>
                            {isAdmin && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">By:</span>
                                <span className="text-xs">{file.uploadedBy}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockMetrics.totalRecords.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockMetrics.processingTime}</div>
                  <p className="text-xs text-muted-foreground">-8% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockMetrics.storageUsed}</div>
                  <p className="text-xs text-muted-foreground">+23% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{isAdmin ? "Pending Review" : "API Calls"}</CardTitle>
                  {isAdmin ? (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isAdmin ? mockMetrics.pendingReview : mockMetrics.apiCalls.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? "Files awaiting approval" : "+5% from last month"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>File Processing Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Chart visualization would go here</p>
                      <p className="text-sm">Integration with charting library needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Quality Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Pie chart visualization would go here</p>
                      <p className="text-sm">Integration with charting library needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DataViewer />
          </TabsContent>

          {/* Quality Tab */}
          <TabsContent value="quality" className="space-y-6">
            <DataQualityMetrics />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Configure general application preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Refresh</Label>
                      <p className="text-sm text-muted-foreground">Automatically refresh data every few seconds</p>
                    </div>
                    <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                  </div>

                  {autoRefresh && (
                    <div className="space-y-2">
                      <Label>Refresh Interval (seconds)</Label>
                      <Select
                        value={refreshInterval.toString()}
                        onValueChange={(value) => setRefreshInterval(Number.parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 seconds</SelectItem>
                          <SelectItem value="30">30 seconds</SelectItem>
                          <SelectItem value="60">1 minute</SelectItem>
                          <SelectItem value="300">5 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications for file processing updates</p>
                    </div>
                    <Switch checked={notifications} onCheckedChange={setNotifications} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compact View</Label>
                      <p className="text-sm text-muted-foreground">Use a more compact layout to show more data</p>
                    </div>
                    <Switch checked={compactView} onCheckedChange={setCompactView} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Processing Settings</CardTitle>
                  <CardDescription>Configure data processing and validation rules</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Quality Threshold</Label>
                    <div className="px-3">
                      <Slider
                        value={qualityThreshold}
                        onValueChange={setQualityThreshold}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>0%</span>
                        <span>{qualityThreshold[0]}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>File Size Limit</Label>
                    <Select defaultValue="100">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50 MB</SelectItem>
                        <SelectItem value="100">100 MB</SelectItem>
                        <SelectItem value="500">500 MB</SelectItem>
                        <SelectItem value="1000">1 GB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duplicate Detection</Label>
                    <Select defaultValue="strict">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Disabled</SelectItem>
                        <SelectItem value="loose">Loose</SelectItem>
                        <SelectItem value="strict">Strict</SelectItem>
                        <SelectItem value="custom">Custom Rules</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Admin Settings</CardTitle>
                  <CardDescription>Administrator-only configuration options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-approve CSV files</Label>
                      <p className="text-sm text-muted-foreground">Automatically approve CSV files without review</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email notifications for reviews</Label>
                      <p className="text-sm text-muted-foreground">Get notified when files need review</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Review timeout (days)</Label>
                    <Select defaultValue="7">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>Configure external API integrations and webhooks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input id="webhook-url" placeholder="https://your-app.com/webhook" type="url" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input id="api-key" placeholder="Enter your API key" type="password" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Webhook Events</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="file-uploaded" defaultChecked />
                      <Label htmlFor="file-uploaded" className="text-sm">
                        File Uploaded
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="processing-complete" defaultChecked />
                      <Label htmlFor="processing-complete" className="text-sm">
                        Processing Complete
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="processing-failed" defaultChecked />
                      <Label htmlFor="processing-failed" className="text-sm">
                        Processing Failed
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="quality-alert" />
                      <Label htmlFor="quality-alert" className="text-sm">
                        Quality Alert
                      </Label>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center space-x-2">
                        <Checkbox id="review-needed" defaultChecked />
                        <Label htmlFor="review-needed" className="text-sm">
                          Review Needed
                        </Label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Test Connection</Button>
                  <Button>Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
