"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Upload,
  FileText,
  Database,
  BarChart3,
  Settings,
  Filter,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Grid3X3,
  List,
  MoreHorizontal,
  RefreshCw,
  Archive,
  Crown,
  Users,
  Shield,
  Zap,
  Wifi,
} from "lucide-react"
import { UserMenu } from "./user-menu"
import { DataViewer } from "./data-viewer"
import { DatabaseStatus } from "./database-status"
import { DataQualityMetrics } from "./data-quality-metrics"
import { isAdmin } from "@/lib/auth-utils"

interface FileItem {
  id: string
  name: string
  type: string
  size: string
  status: "processing" | "completed" | "failed" | "pending_review"
  records: number
  quality: number
  uploadDate: string
  uploadedBy?: string
}

const mockFiles: FileItem[] = [
  {
    id: "1",
    name: "inventory.xlsx",
    type: "Excel",
    size: "5.7 MB",
    status: "processing",
    records: 3400,
    quality: 88,
    uploadDate: "2024-01-15",
    uploadedBy: "john@example.com",
  },
  {
    id: "2",
    name: "customer_data.csv",
    type: "CSV",
    size: "2.3 MB",
    status: "completed",
    records: 1250,
    quality: 92,
    uploadDate: "2024-01-15",
    uploadedBy: "sarah@example.com",
  },
  {
    id: "3",
    name: "user_profiles.xml",
    type: "XML",
    size: "3.2 MB",
    status: "completed",
    records: 2100,
    quality: 94,
    uploadDate: "2024-01-14",
    uploadedBy: "mike@example.com",
  },
]

export default function DataIngestionPortalClient() {
  const { user, isLoaded } = useUser()
  const [mounted, setMounted] = useState(false)
  const [files, setFiles] = useState<FileItem[]>(mockFiles)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "table">("table")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [notifications, setNotifications] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  const userIsAdmin = mounted && isLoaded && user ? isAdmin(user) : false

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || file.status === statusFilter
    const matchesType = typeFilter === "all" || file.type.toLowerCase() === typeFilter.toLowerCase()
    return matchesSearch && matchesStatus && matchesType
  })

  const handleFileSelect = (fileId: string) => {
    setSelectedFiles((prev) => (prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]))
  }

  const handleSelectAll = () => {
    setSelectedFiles(selectedFiles.length === filteredFiles.length ? [] : filteredFiles.map((f) => f.id))
  }

  const handleBulkAction = (action: string) => {
    if (!userIsAdmin && (action === "approve" || action === "reject")) {
      return // Only admins can approve/reject
    }

    console.log(`Performing ${action} on files:`, selectedFiles)
    setSelectedFiles([])
  }

  const handleStatusChange = (fileId: string, newStatus: FileItem["status"]) => {
    if (!userIsAdmin && (newStatus === "completed" || newStatus === "failed")) {
      return // Only admins can change status
    }

    setFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, status: newStatus } : file)))
  }

  const getStatusIcon = (status: FileItem["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "pending_review":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: FileItem["status"]) => {
    const variants = {
      completed: "default",
      failed: "destructive",
      processing: "secondary",
      pending_review: "outline",
    } as const

    return <Badge variant={variants[status] || "secondary"}>{status.replace("_", " ")}</Badge>
  }

  if (!mounted || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-6">
          <div className="mr-4 flex items-center">
            <Database className="h-6 w-6 mr-3 text-primary" />
            <span className="font-bold text-xl text-foreground">Data Ingestion Portal</span>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none"></div>
            <nav className="flex items-center space-x-4">
              {userIsAdmin && (
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <Crown className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
              <UserMenu />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-8 px-6">
        <Tabs defaultValue="upload" className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
            <TabsTrigger
              value="upload"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Upload
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Files
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="quality"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Quality
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* File Upload Section */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Upload className="h-6 w-6 text-primary" />
                    File Upload
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Upload your data files for processing and analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="upload-area rounded-xl p-12 text-center transition-all duration-200">
                    <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2 text-foreground">Click to upload or drag and drop</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Supports CSV, Excel, JSON, XML, and Text files up to 100MB
                    </p>
                    <Button variant="outline" size="lg" className="border-border hover:bg-accent bg-transparent">
                      Choose Files
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <BarChart3 className="h-6 w-6 text-primary" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="stat-card rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-blue-400 mb-1">156</div>
                      <div className="text-sm text-muted-foreground">Total Files</div>
                    </div>
                    <div className="stat-card rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-green-400 mb-1">142</div>
                      <div className="text-sm text-muted-foreground">Processed</div>
                    </div>
                    <div className="stat-card rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-red-400 mb-1">8</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="stat-card rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-yellow-400 mb-1">6</div>
                      <div className="text-sm text-muted-foreground">Queued</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Database Connection */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Database className="h-6 w-6 text-primary" />
                    Database Connection
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="text-muted-foreground">
                  Supabase database connection status and statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Connection Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wifi className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-foreground">Connected</span>
                  </div>
                  <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                    Online
                  </Badge>
                </div>

                {/* Database Stats */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <div className="metric-card-blue rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">1</div>
                    <div className="text-sm text-blue-300">Total Records</div>
                  </div>
                  <div className="metric-card-green rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">1</div>
                    <div className="text-sm text-green-300">Approved</div>
                  </div>
                  <div className="metric-card-yellow rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400 mb-1">0</div>
                    <div className="text-sm text-yellow-300">Ready</div>
                  </div>
                  <div className="metric-card-red rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-400 mb-1">0</div>
                    <div className="text-sm text-red-300">Rejected</div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  Last updated: {new Date().toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold">File Management</h2>
                {selectedFiles.length > 0 && <Badge variant="secondary">{selectedFiles.length} selected</Badge>}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4 mr-2" />
                  Show Filters
                </Button>
                <div className="flex items-center space-x-1 border rounded-md">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {showFilters && (
              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <Label htmlFor="search">Search files...</Label>
                      <Input
                        id="search"
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="pending_review">Pending Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="excel">Excel</SelectItem>
                          <SelectItem value="xml">XML</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedFiles.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Bulk Actions:</span>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction("download")}>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    {userIsAdmin && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleBulkAction("approve")}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleBulkAction("reject")}>
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction("delete")}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedFiles.length === filteredFiles.length}
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
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedFiles.includes(file.id)}
                            onCheckedChange={() => handleFileSelect(file.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{file.type}</TableCell>
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
                            <Progress value={file.quality} className="w-16" />
                            <span className="text-sm">{file.quality}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{file.uploadDate}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              {userIsAdmin && file.status === "pending_review" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleStatusChange(file.id, "completed")}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(file.id, "failed")}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                  <div className="text-2xl font-bold">45,230</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.3 hours</div>
                  <p className="text-xs text-muted-foreground">-8% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                  <Archive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">234 GB</div>
                  <p className="text-xs text-muted-foreground">+23% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12,450</div>
                  <p className="text-xs text-muted-foreground">+5% from last month</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>File Processing Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
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
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>Pie chart visualization would go here</p>
                      <p className="text-sm">Integration with charting library needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Supabase Data (1)
                </CardTitle>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">All articles stored in your Supabase database</p>
                <DataViewer />
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Database Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <DatabaseStatus />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Data Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Select an item to view details</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Quality Tab */}
          <TabsContent value="quality" className="space-y-6">
            <DataQualityMetrics />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    General Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-refresh">Auto Refresh</Label>
                      <p className="text-sm text-muted-foreground">Automatically refresh data every 30 seconds</p>
                    </div>
                    <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notifications">Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications for processing updates</p>
                    </div>
                    <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
                  </div>
                </CardContent>
              </Card>

              {userIsAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Admin Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Review Workflow</Label>
                      <p className="text-sm text-muted-foreground mb-2">Configure automatic review settings</p>
                      <Select defaultValue="manual">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual Review</SelectItem>
                          <SelectItem value="auto">Auto-approve CSV/JSON</SelectItem>
                          <SelectItem value="strict">Review All Files</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <Label>User Management</Label>
                      <p className="text-sm text-muted-foreground mb-2">Manage user permissions and roles</p>
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
