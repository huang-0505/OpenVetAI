"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Define the FileMetadata type
interface FileMetadata {
  id: string
  filename: string
  size: number
  uploadDate: string
  status: "pending" | "ready" | "approved" | "rejected"
  metadata: {
    title: string
    description: string
    author: string
    source: string
    keyPoints: string[]
    tags: string[]
    category: string
    trainingDate: Date | null
    retentionPolicy: string
    securityClassification: string
    dataOwner: string
  }
}

const DataIngestionPortalClient = () => {
  const [files, setFiles] = useState<File[]>([])
  const [fileMetadatas, setFileMetadatas] = useState<FileMetadata[]>([])
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false) // Mock admin status
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [metadataForm, setMetadataForm] = useState({
    title: "",
    description: "",
    author: "",
    source: "",
    keyPoints: [""],
    tags: [""],
    category: "",
    trainingDate: null,
    retentionPolicy: "",
    securityClassification: "",
    dataOwner: "",
  })
  const { toast } = useToast()

  // Mock API calls (replace with actual API endpoints)
  const fetchFiles = async () => {
    // Simulate fetching file metadata from an API
    const mockData: FileMetadata[] = [
      {
        id: "1",
        filename: "document1.pdf",
        size: 1024,
        uploadDate: "2024-01-01",
        status: "pending",
        metadata: {
          title: "Initial Document",
          description: "A test document for initial setup.",
          author: "John Doe",
          source: "Internal",
          keyPoints: ["Setup", "Testing"],
          tags: ["test", "initial"],
          category: "Documentation",
          trainingDate: new Date(),
          retentionPolicy: "3 years",
          securityClassification: "Confidential",
          dataOwner: "Data Team",
        },
      },
      {
        id: "2",
        filename: "report2.docx",
        size: 2048,
        uploadDate: "2024-01-05",
        status: "ready",
        metadata: {
          title: "Monthly Report",
          description: "Financial report for January.",
          author: "Jane Smith",
          source: "Finance Dept",
          keyPoints: ["Financials", "Analysis"],
          tags: ["report", "finance"],
          category: "Reports",
          trainingDate: new Date(),
          retentionPolicy: "5 years",
          securityClassification: "Restricted",
          dataOwner: "Finance Team",
        },
      },
      {
        id: "3",
        filename: "presentation3.pptx",
        size: 1536,
        uploadDate: "2024-01-10",
        status: "approved",
        metadata: {
          title: "Sales Presentation",
          description: "Presentation for the sales team.",
          author: "Mike Johnson",
          source: "Sales Dept",
          keyPoints: ["Sales", "Marketing"],
          tags: ["presentation", "sales"],
          category: "Presentations",
          trainingDate: new Date(),
          retentionPolicy: "2 years",
          securityClassification: "Public",
          dataOwner: "Sales Team",
        },
      },
      {
        id: "4",
        filename: "notes4.txt",
        size: 512,
        uploadDate: "2024-01-15",
        status: "rejected",
        metadata: {
          title: "Meeting Notes",
          description: "Notes from the team meeting.",
          author: "Emily White",
          source: "Team Meeting",
          keyPoints: ["Meeting", "Notes"],
          tags: ["notes", "team"],
          category: "Notes",
          trainingDate: new Date(),
          retentionPolicy: "1 year",
          securityClassification: "Internal",
          dataOwner: "Project Team",
        },
      },
    ]

    setFileMetadatas(mockData)
  }

  useEffect(() => {
    // Simulate fetching files and admin status on component mount
    fetchFiles()
    // Simulate checking admin status (e.g., from user context)
    setIsAdmin(true)
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...acceptedFiles])
    // Reset metadata form on new file upload
    setMetadataForm({
      title: "",
      description: "",
      author: "",
      source: "",
      keyPoints: [""],
      tags: [""],
      category: "",
      trainingDate: null,
      retentionPolicy: "",
      securityClassification: "",
      dataOwner: "",
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const handleFileSelect = (fileId: string) => {
    const selected = fileMetadatas.find((file) => file.id === fileId)
    setSelectedFile(selected || null)
    if (selected) {
      setMetadataForm(selected.metadata)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setMetadataForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleKeyPointChange = (index: number, value: string) => {
    const newKeyPoints = [...metadataForm.keyPoints]
    newKeyPoints[index] = value
    setMetadataForm((prev) => ({ ...prev, keyPoints: newKeyPoints }))
  }

  const handleAddKeyPoint = () => {
    setMetadataForm((prev) => ({ ...prev, keyPoints: [...prev.keyPoints, ""] }))
  }

  const handleRemoveKeyPoint = (index: number) => {
    const newKeyPoints = [...metadataForm.keyPoints]
    newKeyPoints.splice(index, 1)
    setMetadataForm((prev) => ({ ...prev, keyPoints: newKeyPoints }))
  }

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...metadataForm.tags]
    newTags[index] = value
    setMetadataForm((prev) => ({ ...prev, tags: newTags }))
  }

  const handleAddTag = () => {
    setMetadataForm((prev) => ({ ...prev, tags: [...prev.tags, ""] }))
  }

  const handleRemoveTag = (index: number) => {
    const newTags = [...metadataForm.tags]
    newTags.splice(index, 1)
    setMetadataForm((prev) => ({ ...prev, tags: newTags }))
  }

  const handleTrainingDateChange = (date: Date | undefined) => {
    setMetadataForm((prev) => ({ ...prev, trainingDate: date }))
  }

  const handleSubmitMetadata = () => {
    // Simulate submitting metadata to an API
    console.log("Submitting metadata:", metadataForm)
    toast({
      title: "Metadata Submitted",
      description: "Your metadata has been successfully submitted.",
    })
  }

  const handleApproveFile = async (fileId: string) => {
    setIsProcessing(true)
    // Simulate API call to approve the file
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate delay
    setFileMetadatas((prev) => prev.map((file) => (file.id === fileId ? { ...file, status: "approved" } : file)))
    setSelectedFile((prev) => (prev && prev.id === fileId ? { ...prev, status: "approved" } : prev))
    setIsProcessing(false)
    toast({
      title: "File Approved",
      description: "The file has been successfully approved.",
    })
  }

  const handleRejectFile = async (fileId: string) => {
    setIsProcessing(true)
    // Simulate API call to reject the file
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate delay
    setFileMetadatas((prev) => prev.map((file) => (file.id === fileId ? { ...file, status: "rejected" } : file)))
    setSelectedFile((prev) => (prev && prev.id === fileId ? { ...prev, status: "rejected" } : prev))
    setIsProcessing(false)
    toast({
      title: "File Rejected",
      description: "The file has been successfully rejected.",
    })
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Data Ingestion Portal</h1>

      {/* File Upload Section */}
      <div {...getRootProps()} className="border-2 border-dashed rounded-md p-4 mb-4 cursor-pointer">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-center">Drop the files here ...</p>
        ) : (
          <p className="text-center">Drag 'n' drop some files here, or click to select files</p>
        )}
      </div>

      {/* File List Section */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Uploaded Files</h2>
        {files.length > 0 ? (
          <ul>
            {files.map((file, index) => (
              <li key={index} className="mb-1">
                {file.name} - {file.size} bytes
              </li>
            ))}
          </ul>
        ) : (
          <p>No files uploaded yet.</p>
        )}
      </div>

      {/* Data Table Section */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">File Metadata</h2>
        <ScrollArea>
          <Table>
            <TableCaption>A list of your recent files.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">File Name</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fileMetadatas.map((file) => (
                <TableRow
                  key={file.id}
                  onClick={() => handleFileSelect(file.id)}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <TableCell className="font-medium">{file.filename}</TableCell>
                  <TableCell>{file.uploadDate}</TableCell>
                  <TableCell>{file.size}</TableCell>
                  <TableCell>
                    {file.status === "pending" && <Badge variant="secondary">Pending</Badge>}
                    {file.status === "ready" && <Badge className="bg-blue-100 text-blue-800">Ready</Badge>}
                    {file.status === "approved" && <Badge className="bg-green-100 text-green-800">Approved</Badge>}
                    {file.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Data Review Section */}
      {selectedFile && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Reviewing: {selectedFile.filename}</h2>

          {/* Metadata Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input type="text" id="title" name="title" value={metadataForm.title} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="author">Author</Label>
              <Input type="text" id="author" name="author" value={metadataForm.author} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Input type="text" id="source" name="source" value={metadataForm.source} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                type="text"
                id="category"
                name="category"
                value={metadataForm.category}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="retentionPolicy">Retention Policy</Label>
              <Input
                type="text"
                id="retentionPolicy"
                name="retentionPolicy"
                value={metadataForm.retentionPolicy}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="securityClassification">Security Classification</Label>
              <Input
                type="text"
                id="securityClassification"
                name="securityClassification"
                value={metadataForm.securityClassification}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="dataOwner">Data Owner</Label>
              <Input
                type="text"
                id="dataOwner"
                name="dataOwner"
                value={metadataForm.dataOwner}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="trainingDate">Training Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !metadataForm.trainingDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {metadataForm.trainingDate ? format(metadataForm.trainingDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={metadataForm.trainingDate}
                    onSelect={handleTrainingDateChange}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={metadataForm.description}
              onChange={handleInputChange}
              className="mb-4"
            />
          </div>

          <div>
            <Label>Key Points</Label>
            {metadataForm.keyPoints.map((keyPoint, index) => (
              <div key={index} className="flex items-center mb-2">
                <Input
                  type="text"
                  value={keyPoint}
                  onChange={(e) => handleKeyPointChange(index, e.target.value)}
                  className="mr-2"
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveKeyPoint(index)}>
                  ❌
                </Button>
              </div>
            ))}
            <Button type="button" onClick={handleAddKeyPoint}>
              Add Key Point
            </Button>
          </div>

          <div className="mt-4">
            <Label>Tags</Label>
            {metadataForm.tags.map((tag, index) => (
              <div key={index} className="flex items-center mb-2">
                <Input
                  type="text"
                  value={tag}
                  onChange={(e) => handleTagChange(index, e.target.value)}
                  className="mr-2"
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveTag(index)}>
                  ❌
                </Button>
              </div>
            ))}
            <Button type="button" onClick={handleAddTag}>
              Add Tag
            </Button>
          </div>

          <Button onClick={handleSubmitMetadata} className="mt-4">
            Submit Metadata
          </Button>

          {/* Action Buttons - Make them VERY obvious */}
          {selectedFile && selectedFile.status === "pending" && isAdmin && (
            <div className="mt-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-yellow-800 mb-2">⚠️ ADMIN ACTION REQUIRED</h3>
                <p className="text-yellow-700">
                  This file is pending approval. Review the content above and choose an action:
                </p>
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => handleApproveFile(selectedFile.id)}
                  disabled={isProcessing}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold min-w-[150px]"
                >
                  ✅ APPROVE
                </Button>

                <Button
                  onClick={() => handleRejectFile(selectedFile.id)}
                  disabled={isProcessing}
                  variant="destructive"
                  size="lg"
                  className="px-8 py-3 text-lg font-semibold min-w-[150px]"
                >
                  ❌ REJECT
                </Button>
              </div>

              {isProcessing && (
                <div className="text-center mt-4">
                  <p className="text-yellow-700">Processing your decision...</p>
                </div>
              )}
            </div>
          )}

          {selectedFile && selectedFile.status === "ready" && isAdmin && (
            <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-blue-800 mb-2">📋 READY FOR REVIEW</h3>
                <p className="text-blue-700">This file has been processed and is ready for your approval:</p>
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => handleApproveFile(selectedFile.id)}
                  disabled={isProcessing}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold min-w-[150px]"
                >
                  ✅ APPROVE
                </Button>

                <Button
                  onClick={() => handleRejectFile(selectedFile.id)}
                  disabled={isProcessing}
                  variant="destructive"
                  size="lg"
                  className="px-8 py-3 text-lg font-semibold min-w-[150px]"
                >
                  ❌ REJECT
                </Button>
              </div>

              {isProcessing && (
                <div className="text-center mt-4">
                  <p className="text-blue-700">Processing your decision...</p>
                </div>
              )}
            </div>
          )}

          {selectedFile && selectedFile.status === "approved" && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-700 font-medium">✅ This file has been approved and is ready for training</p>
            </div>
          )}

          {selectedFile && selectedFile.status === "rejected" && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-red-700 font-medium">❌ This file has been rejected</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DataIngestionPortalClient
