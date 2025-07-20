"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  BarChart3,
  Settings,
  RefreshCw,
  Download,
  Search,
  Shield,
  Bell,
  HelpCircle,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useMounted } from "@/hooks/use-mounted"
import { useUserRole } from "@/lib/auth-utils"
import { UserMenu } from "@/components/user-menu"

interface FileData {
  id: string
  name: string
  size: number
  type: string
  status: "processing" | "completed" | "failed" | "queued"
  uploadedAt: Date
  processedAt?: Date
  errorMessage?: string
  qualityScore?: number
  duplicateOf?: string
}

interface DatabaseStats {
  totalRecords: number
  approved: number
  rejected: number
  pending: number
  lastUpdated: Date
}

export default function DataIngestionPortalClient() {
  const mounted = useMounted()
  const userRole = useUserRole()
  const [files, setFiles] = useState<FileData[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState("upload")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dbStats, setDbStats] = useState<DatabaseStats>({
    totalRecords: 1,
    approved: 1,
    rejected: 0,
    pending: 0,
    lastUpdated: new Date(),
  })

  // Mock data for demonstration
  useEffect(() => {
    const mockFiles: FileData[] = [
      {
        id: "1",
        name: "customer_data.csv",
        size: 2048576,
        type: "text/csv",
        status: "completed",
        uploadedAt: new Date(Date.now() - 3600000),
        processedAt: new Date(Date.now() - 3000000),
        qualityScore: 95,
      },
      {
        id: "2",
        name: "inventory.xlsx",
        size: 1024000,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        status: "processing",
        uploadedAt: new Date(Date.now() - 1800000),
        qualityScore: 88,
      },
      {
        id: "3",
        name: "sales_report.json",
        size: 512000,
        type: "application/json",
        status: "failed",
        uploadedAt: new Date(Date.now() - 900000),
        errorMessage: "Invalid JSON format on line 45",
        qualityScore: 45,
      },
    ]
    setFiles(mockFiles)
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIsUploading(true)

    acceptedFiles.forEach((file) => {
      const newFile: FileData = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        status: "queued",
        uploadedAt: new Date(),
        qualityScore: Math.floor(Math.random() * 40) + 60,
      }

      setFiles((prev) => [...prev, newFile])

      // Simulate processing
      setTimeout(() => {
        setFiles((prev) => prev.map((f) => (f.id === newFile.id ? { ...f, status: "processing" as const } : f)))

        setTimeout(() => {
          const success = Math.random() > 0.2
          setFiles((prev) =>
            prev.map((f) =>
              f.id === newFile.id
                ? {
                    ...f,
                    status: success ? ("completed" as const) : ("failed" as const),
                    processedAt: success ? new Date() : undefined,
                    errorMessage: success ? undefined : "Processing failed due to data format issues",
                  }
                : f,
            ),
          )
        }, 3000)
      }, 1000)
    })

    setTimeout(() => setIsUploading(false), 1000)
    toast({
      title: "Files uploaded",
      description: `${acceptedFiles.length} file(s) added to processing queue.`,
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/json": [".json"],
      "text/xml": [".xml"],
      "text/plain": [".txt"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  })

  const getStatusIcon = (status: FileData["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "processing":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case "queued":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: FileData["status"]) => {
    const variants = {
      completed: "default",
      failed: "destructive",
      processing: "secondary",
      queued: "outline",
    } as const

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    )
  }

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || file.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: files.length,
    processed: files.filter((f) => f.status === "completed").length,
    failed: files.filter((f) => f.status === "failed").length,
    queued: files.filter((f) => f.status === "queued" || f.status === "processing").length,
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen dark-theme">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Database className="h-8 w-8 text-blue-400" />
            <h1 className="text-xl font-semibold text-white">Data Ingestion Portal</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <HelpCircle className="h-5 w-5" />
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-black/20 border border-white/10">
            <TabsTrigger value="upload" className="dark-tab data-[state=active]:dark-tab data-[state=active]:active">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="files" className="dark-tab data-[state=active]:dark-tab data-[state=active]:active">
              <FileText className="h-4 w-4 mr-2" />
              Files
            </TabsTrigger>
            <TabsTrigger value="analytics" className="dark-tab data-[state=active]:dark-tab data-[state=active]:active">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="quality" className="dark-tab data-[state=active]:dark-tab data-[state=active]:active">
              <Shield className="h-4 w-4 mr-2" />
              Quality
            </TabsTrigger>
            <TabsTrigger value="settings" className="dark-tab data-[state=active]:dark-tab data-[state=active]:active">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File Upload */}
              <Card className="dark-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Upload className="h-5 w-5 mr-2" />
                    File Upload
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Upload your data files for processing and analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    {...getRootProps()}
                    className={`dark-upload-area rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                      isDragActive ? "scale-105" : ""
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-12 w-12 mx-auto mb-4 text-blue-400" />
                    <p className="text-lg font-medium text-white mb-2">
                      {isDragActive ? "Drop files here" : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-sm text-gray-400">Supports CSV, Excel, JSON, XML, and Text files up to 100MB</p>
                  </div>
                  {isUploading && (
                    <div className="mt-4">
                      <Progress value={75} className="w-full" />
                      <p className="text-sm text-gray-400 mt-2">Uploading files...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="dark-card">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="stat-card-blue rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
                      <div className="text-sm text-gray-300">Total Files</div>
                    </div>
                    <div className="stat-card-green rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">{stats.processed}</div>
                      <div className="text-sm text-gray-300">Processed</div>
                    </div>
                    <div className="stat-card-red rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
                      <div className="text-sm text-gray-300">Failed</div>
                    </div>
                    <div className="stat-card-yellow rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-400">{stats.queued}</div>
                      <div className="text-sm text-gray-300">Queued</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Database Connection */}
            <Card className="dark-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center text-white">
                    <Database className="h-5 w-5 mr-2" />
                    Database Connection
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Supabase database connection status and statistics
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-white bg-green-500/20 px-2 py-1 rounded">Connected</span>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                    Online
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="stat-card-blue rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">{dbStats.totalRecords}</div>
                    <div className="text-sm text-gray-300">Total Records</div>
                  </div>
                  <div className="stat-card-green rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{dbStats.approved}</div>
                    <div className="text-sm text-gray-300">Approved</div>
                  </div>
                  <div className="stat-card-yellow rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400">{dbStats.pending}</div>
                    <div className="text-sm text-gray-300">Ready</div>
                  </div>
                  <div className="stat-card-red rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-400">{dbStats.rejected}</div>
                    <div className="text-sm text-gray-300">Rejected</div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-400">Last updated: {dbStats.lastUpdated.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <Card className="dark-card">
              <CardHeader>
                <CardTitle className="text-white">File Management</CardTitle>
                <CardDescription className="text-gray-300">View and manage uploaded files</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border border-white/10 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-white/10">
                        <TableHead className="text-gray-300">File Name</TableHead>
                        <TableHead className="text-gray-300">Size</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Quality</TableHead>
                        <TableHead className="text-gray-300">Uploaded</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFiles.map((file) => (
                        <TableRow key={file.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="font-medium text-white">
                            <div className="flex items-center">
                              {getStatusIcon(file.status)}
                              <span className="ml-2">{file.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300">{(file.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                          <TableCell>{getStatusBadge(file.status)}</TableCell>
                          <TableCell className="text-gray-300">
                            {file.qualityScore ? `${file.qualityScore}%` : "-"}
                          </TableCell>
                          <TableCell className="text-gray-300">{file.uploadedAt.toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="ghost" className="text-blue-400 hover:bg-blue-400/10">
                                <Download className="h-4 w-4" />
                              </Button>
                              {userRole === "admin" && (
                                <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-400/10">
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
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

          <TabsContent value="analytics" className="space-y-6">
            <Card className="dark-card">
              <CardHeader>
                <CardTitle className="text-white">Analytics Dashboard</CardTitle>
                <CardDescription className="text-gray-300">Data processing insights and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-400">Analytics dashboard coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6">
            <Card className="dark-card">
              <CardHeader>
                <CardTitle className="text-white">Data Quality</CardTitle>
                <CardDescription className="text-gray-300">Monitor and improve data quality metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-400">Quality metrics dashboard coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="dark-card">
              <CardHeader>
                <CardTitle className="text-white">Settings</CardTitle>
                <CardDescription className="text-gray-300">Configure your data ingestion preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Auto-process uploads</Label>
                      <p className="text-sm text-gray-400">Automatically process files after upload</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Email notifications</Label>
                      <p className="text-sm text-gray-400">Receive email updates on processing status</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Duplicate detection</Label>
                      <p className="text-sm text-gray-400">Automatically detect and flag duplicate records</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
