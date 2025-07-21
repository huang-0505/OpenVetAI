"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs"
import {
  Upload,
  BarChart3,
  Shield,
  Settings,
  Database,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Globe,
  Calendar,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { detectDuplicates } from "@/lib/duplicate-detection"

interface UploadedFile {
  id: string
  file?: File
  url?: string
  name: string
  status: "uploading" | "processing" | "completed" | "error" | "duplicate"
  progress: number
  processedData?: any
  error?: string
  duplicateOf?: string
}

// Predefined labels for different content types
const CONTENT_LABELS = {
  "medical-journal": [
    "Clinical Research",
    "Case Studies",
    "Treatment Protocols",
    "Diagnostic Methods",
    "Pharmacology",
    "Surgery Techniques",
    "Patient Care",
    "Medical Equipment",
    "Laboratory Testing",
    "Emergency Medicine",
  ],
  "nutrition-blog": [
    "Diet Plans",
    "Nutritional Science",
    "Weight Management",
    "Supplements",
    "Food Safety",
    "Meal Planning",
    "Health Benefits",
    "Dietary Restrictions",
    "Cooking Tips",
    "Wellness Advice",
  ],
  "veterinary-research": [
    "Animal Health",
    "Veterinary Medicine",
    "Animal Behavior",
    "Preventive Care",
    "Surgical Procedures",
    "Diagnostic Imaging",
    "Pharmacotherapy",
    "Infectious Diseases",
    "Nutrition",
    "Emergency Care",
  ],
  "fitness-content": [
    "Exercise Routines",
    "Strength Training",
    "Cardio Workouts",
    "Flexibility",
    "Sports Performance",
    "Injury Prevention",
    "Recovery Methods",
    "Equipment Reviews",
    "Training Programs",
    "Fitness Goals",
  ],
}

// Training schedule configuration
const TRAINING_SCHEDULES = {
  weekly: { label: "Weekly", days: 7 },
  biweekly: { label: "Bi-weekly", days: 14 },
  monthly: { label: "Monthly", days: 30 },
  quarterly: { label: "Quarterly", days: 90 },
}

export default function HomePage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("upload")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [dbFiles, setDbFiles] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const [urlInput, setUrlInput] = useState("")
  const [isProcessingUrl, setIsProcessingUrl] = useState(false)
  const [selectedContentType, setSelectedContentType] = useState<string>("medical-journal")
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [trainingSchedule, setTrainingSchedule] = useState("monthly")
  const [nextTrainingDate, setNextTrainingDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
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

  // Simulate URL scraping
  const scrapeUrl = async (url: string): Promise<string> => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Mock scraped content based on URL
    if (url.includes("journal") || url.includes("research")) {
      return `Title: Advanced Veterinary Anesthesia Protocols
      
Abstract: This study examines the efficacy of modern anesthesia protocols in veterinary medicine, focusing on safety improvements and patient outcomes.

Introduction: Veterinary anesthesia has evolved significantly over the past decade, with new protocols showing improved safety margins and better patient recovery times.

Methods: A retrospective analysis of 500 cases was conducted across multiple veterinary clinics, examining anesthesia protocols, patient demographics, and outcomes.

Results: The new protocols showed a 15% improvement in recovery times and a 20% reduction in complications compared to traditional methods.

Discussion: These findings suggest that updated anesthesia protocols should be adopted more widely in veterinary practice.

Conclusion: Modern anesthesia protocols offer significant advantages in veterinary medicine and should be considered standard practice.`
    } else if (url.includes("nutrition") || url.includes("diet")) {
      return `The Ultimate Guide to Pet Nutrition

Introduction: Proper nutrition is fundamental to pet health and longevity. This comprehensive guide covers essential nutrients, feeding schedules, and common dietary mistakes.

Essential Nutrients:
- Proteins: Building blocks for muscle development
- Carbohydrates: Energy source for daily activities  
- Fats: Essential for coat health and vitamin absorption
- Vitamins: Support immune system and metabolic functions
- Minerals: Critical for bone health and enzyme function

Feeding Guidelines:
- Puppies: 3-4 meals per day with high-protein content
- Adult dogs: 2 meals per day with balanced nutrition
- Senior pets: Adjusted portions with joint support supplements

Common Mistakes:
- Overfeeding leading to obesity
- Inconsistent feeding schedules
- Poor quality commercial foods
- Lack of fresh water availability

Conclusion: A well-balanced diet tailored to your pet's life stage and activity level is essential for optimal health.`
    } else {
      return `Scraped content from: ${url}

This is simulated content that would be extracted from the provided URL. In a real implementation, this would use web scraping libraries to extract clean text content from the webpage, removing HTML tags, advertisements, and navigation elements.

The content would then be processed and structured based on the detected content type for optimal training data preparation.`
    }
  }

  // Enhanced AI processing with content-type specific prompts
  const processContentWithAI = async (content: string, filename: string, contentType: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Content-type specific processing
    switch (contentType) {
      case "medical-journal":
        return {
          title: `Medical Study: ${filename.replace(/\.(txt|pdf|doc|docx)$/, "")}`,
          summary:
            "This medical journal article presents research findings on clinical outcomes, treatment efficacy, and evidence-based practices in veterinary medicine.",
          keyPoints: [
            "Study methodology and patient demographics",
            "Primary and secondary clinical endpoints",
            "Statistical analysis and significance testing",
            "Clinical implications and treatment recommendations",
            "Safety profile and adverse event monitoring",
          ],
          contentType: "Medical Research",
          extractedData: {
            studyType: "Clinical Trial",
            sampleSize: "N=" + Math.floor(Math.random() * 500 + 50),
            duration: Math.floor(Math.random() * 24 + 6) + " months",
            primaryEndpoint: "Treatment efficacy and safety",
            methodology: "Randomized controlled trial",
          },
        }

      case "nutrition-blog":
        return {
          title: `Nutrition Guide: ${filename.replace(/\.(txt|pdf|doc|docx)$/, "")}`,
          summary:
            "This nutrition-focused content provides evidence-based dietary recommendations, meal planning strategies, and nutritional science insights for optimal health outcomes.",
          keyPoints: [
            "Nutritional requirements and daily values",
            "Meal planning and portion control strategies",
            "Evidence-based dietary recommendations",
            "Supplement guidance and safety considerations",
            "Lifestyle integration and sustainability tips",
          ],
          contentType: "Nutrition Education",
          extractedData: {
            targetAudience: "General public",
            nutritionFocus: "Balanced diet approach",
            evidenceLevel: "Peer-reviewed research",
            practicalTips: "Meal prep and planning",
            healthGoals: "Weight management and wellness",
          },
        }

      case "veterinary-research":
        return {
          title: `Veterinary Research: ${filename.replace(/\.(txt|pdf|doc|docx)$/, "")}`,
          summary:
            "This veterinary research document covers animal health protocols, diagnostic procedures, and treatment methodologies for companion and livestock animals.",
          keyPoints: [
            "Animal health assessment protocols",
            "Diagnostic imaging and laboratory testing",
            "Treatment protocols and medication guidelines",
            "Preventive care and vaccination schedules",
            "Emergency procedures and critical care",
          ],
          contentType: "Veterinary Medicine",
          extractedData: {
            animalTypes: "Dogs, cats, livestock",
            practiceArea: "General veterinary medicine",
            procedures: "Diagnostic and therapeutic",
            equipment: "Standard veterinary tools",
            protocols: "Evidence-based guidelines",
          },
        }

      case "fitness-content":
        return {
          title: `Fitness Guide: ${filename.replace(/\.(txt|pdf|doc|docx)$/, "")}`,
          summary:
            "This fitness content provides exercise routines, training methodologies, and performance optimization strategies for various fitness levels and goals.",
          keyPoints: [
            "Exercise programming and periodization",
            "Strength training and muscle development",
            "Cardiovascular fitness and endurance",
            "Injury prevention and recovery protocols",
            "Performance tracking and goal setting",
          ],
          contentType: "Fitness Training",
          extractedData: {
            fitnessLevel: "Beginner to advanced",
            exerciseTypes: "Strength and cardio",
            equipment: "Gym and home workouts",
            duration: "4-12 week programs",
            goals: "Strength, endurance, weight loss",
          },
        }

      default:
        return {
          title: `Document: ${filename}`,
          summary:
            "This document contains general content that has been processed and structured for training purposes.",
          keyPoints: [
            "Key information extracted from content",
            "Relevant topics and themes identified",
            "Important concepts and terminology",
            "Actionable insights and recommendations",
          ],
          contentType: "General Content",
          extractedData: {
            wordCount: Math.floor(Math.random() * 5000 + 1000),
            readingLevel: "Professional",
            topics: "Various",
            format: "Structured text",
          },
        }
    }
  }

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      const existingFiles = [...dbFiles, ...uploadedFiles.filter((f) => f.status === "completed")]

      const newFiles: UploadedFile[] = Array.from(files).map((file) => {
        const duplicateCheck = detectDuplicates({ name: file.name }, existingFiles)

        return {
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          status: duplicateCheck.isDuplicate ? ("duplicate" as const) : ("uploading" as const),
          progress: 0,
          duplicateOf: duplicateCheck.duplicateOf,
        }
      })

      setUploadedFiles((prev) => [...prev, ...newFiles])

      for (const uploadedFile of newFiles) {
        if (uploadedFile.status === "duplicate") {
          toast({
            title: "Duplicate file detected",
            description: `${uploadedFile.name} already exists as ${uploadedFile.duplicateOf}`,
            variant: "destructive",
          })
          continue
        }

        try {
          // Simulate upload progress
          for (let progress = 0; progress <= 100; progress += 25) {
            await new Promise((resolve) => setTimeout(resolve, 300))
            setUploadedFiles((prev) => prev.map((f) => (f.id === uploadedFile.id ? { ...f, progress } : f)))
          }

          // Update status to processing
          setUploadedFiles((prev) => prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: "processing" } : f)))

          // Read file content
          const content = await readFileContent(uploadedFile.file!)

          // Process with AI using content-type specific prompts
          const processedData = await processContentWithAI(content, uploadedFile.file!.name, selectedContentType)

          // Save to database
          let dbRecord = null
          try {
            const { data, error } = await supabase
              .from("processed_data")
              .insert({
                name: uploadedFile.file!.name,
                type: selectedContentType,
                source: "file-upload",
                original_content: content.substring(0, 10000),
                processed_content: JSON.stringify(processedData),
                extracted_data: processedData,
                labels: selectedLabels,
                status: "pending",
                user_id: user?.id || "anonymous",
                uploaded_by: user?.emailAddresses[0]?.emailAddress || "anonymous",
              })
              .select()

            if (error) throw error
            dbRecord = data?.[0]
            fetchDbFiles()
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
            description: `${uploadedFile.file!.name} has been processed and is pending approval.`,
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
            description: `Failed to process ${uploadedFile.file!.name}`,
            variant: "destructive",
          })
        }
      }
    },
    [user, selectedContentType, selectedLabels, dbFiles, uploadedFiles, fetchDbFiles, toast],
  )

  const handleUrlSubmit = useCallback(async () => {
    if (!urlInput.trim()) return

    const existingFiles = [...dbFiles, ...uploadedFiles.filter((f) => f.status === "completed")]
    const urlName = new URL(urlInput).hostname + new URL(urlInput).pathname
    const duplicateCheck = detectDuplicates({ name: urlName }, existingFiles)

    if (duplicateCheck.isDuplicate) {
      toast({
        title: "Duplicate URL detected",
        description: `This URL content already exists as ${duplicateCheck.duplicateOf}`,
        variant: "destructive",
      })
      return
    }

    const urlFile: UploadedFile = {
      id: Math.random().toString(36).substr(2, 9),
      url: urlInput,
      name: urlName,
      status: "uploading",
      progress: 0,
    }

    setUploadedFiles((prev) => [...prev, urlFile])
    setIsProcessingUrl(true)

    try {
      // Simulate scraping progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        setUploadedFiles((prev) => prev.map((f) => (f.id === urlFile.id ? { ...f, progress } : f)))
      }

      // Update status to processing
      setUploadedFiles((prev) => prev.map((f) => (f.id === urlFile.id ? { ...f, status: "processing" } : f)))

      // Scrape URL content
      const scrapedContent = await scrapeUrl(urlInput)

      // Process with AI
      const processedData = await processContentWithAI(scrapedContent, urlName, selectedContentType)

      // Save to database
      let dbRecord = null
      try {
        const { data, error } = await supabase
          .from("processed_data")
          .insert({
            name: urlName,
            type: selectedContentType,
            source: "url-scraping",
            original_content: scrapedContent.substring(0, 10000),
            processed_content: JSON.stringify(processedData),
            extracted_data: processedData,
            labels: selectedLabels,
            status: "pending",
            user_id: user?.id || "anonymous",
            uploaded_by: user?.emailAddresses[0]?.emailAddress || "anonymous",
          })
          .select()

        if (error) throw error
        dbRecord = data?.[0]
        fetchDbFiles()
      } catch (dbError) {
        console.warn("Database operation failed:", dbError)
      }

      // Update status to completed
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === urlFile.id
            ? {
                ...f,
                status: "completed",
                processedData: dbRecord || processedData,
              }
            : f,
        ),
      )

      toast({
        title: "URL processed successfully",
        description: `Content from ${urlInput} has been scraped and processed.`,
      })

      setUrlInput("")
    } catch (error) {
      console.error("Error processing URL:", error)
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === urlFile.id
            ? {
                ...f,
                status: "error",
                error: error instanceof Error ? error.message : "URL processing failed",
              }
            : f,
        ),
      )

      toast({
        title: "Error processing URL",
        description: `Failed to process ${urlInput}`,
        variant: "destructive",
      })
    } finally {
      setIsProcessingUrl(false)
    }
  }, [urlInput, selectedContentType, selectedLabels, dbFiles, uploadedFiles, fetchDbFiles, toast, user])

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
          description: "File has been approved and is now available for training.",
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
          description: "File has been rejected and will not be used for training.",
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
      case "duplicate":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getDbStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            Pending Review
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
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]))
  }

  const calculateNextTrainingDate = (schedule: string) => {
    const days = TRAINING_SCHEDULES[schedule as keyof typeof TRAINING_SCHEDULES]?.days || 30
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  }

  const handleTrainingScheduleChange = (schedule: string) => {
    setTrainingSchedule(schedule)
    setNextTrainingDate(calculateNextTrainingDate(schedule))
  }

  const pendingFiles = dbFiles.filter((f) => f.status === "pending")
  const approvedFiles = dbFiles.filter((f) => f.status === "approved")
  const allFiles = [...dbFiles, ...uploadedFiles.filter((f) => f.status === "completed")]

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
                <div className="flex items-center space-x-2 text-sm text-slate-300">
                  <Clock className="h-4 w-4" />
                  <span>Next Training: {nextTrainingDate.toLocaleDateString()}</span>
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
          {/* Training Schedule Notice */}
          <div className="mb-6">
            <Card className="bg-blue-900/20 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-blue-300 text-sm">
                        <strong>Training Schedule:</strong>{" "}
                        {TRAINING_SCHEDULES[trainingSchedule as keyof typeof TRAINING_SCHEDULES]?.label}
                        <span className="ml-2">
                          Next training begins {nextTrainingDate.toLocaleDateString()}({approvedFiles.length} files
                          ready)
                        </span>
                      </p>
                    </div>
                  </div>
                  <Select value={trainingSchedule} onValueChange={handleTrainingScheduleChange}>
                    <SelectTrigger className="w-32 bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRAINING_SCHEDULES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Notice */}
          {isAdmin && pendingFiles.length > 0 && (
            <div className="mb-6">
              <Card className="bg-yellow-900/20 border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-yellow-400" />
                    <p className="text-yellow-300 text-sm">
                      <strong>Admin Review Required:</strong> {pendingFiles.length} file
                      {pendingFiles.length > 1 ? "s" : ""} pending approval for next training cycle.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="upload" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Upload className="h-4 w-4 mr-2" />
                Data Input
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
                      Upload files or provide URLs to scrape and process content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Content Type Selection */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium">Content Type</Label>
                      <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medical-journal">Medical Journal</SelectItem>
                          <SelectItem value="nutrition-blog">Nutrition Blog</SelectItem>
                          <SelectItem value="veterinary-research">Veterinary Research</SelectItem>
                          <SelectItem value="fitness-content">Fitness Content</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Predefined Labels */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium">Select Labels</Label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {CONTENT_LABELS[selectedContentType as keyof typeof CONTENT_LABELS]?.map((label) => (
                          <Badge
                            key={label}
                            variant={selectedLabels.includes(label) ? "default" : "outline"}
                            className={`cursor-pointer text-xs ${
                              selectedLabels.includes(label)
                                ? "bg-blue-600 text-white"
                                : "border-slate-500 text-slate-300 hover:bg-slate-700"
                            }`}
                            onClick={() => toggleLabel(label)}
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">{selectedLabels.length} labels selected</p>
                    </div>

                    {/* File Upload Section */}
                    <div
                      className={`upload-zone border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 cursor-pointer ${
                        isDragOver
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-300 mb-1">Drop files here or click to upload</p>
                      <p className="text-xs text-slate-500">Supports TXT, PDF, DOC files</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".txt,.pdf,.doc,.docx"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </div>

                    {/* URL Input Section */}
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium">URL Input</Label>
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            type="url"
                            placeholder="https://example.com/article"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            className="pl-10 bg-slate-700 border-slate-600 text-white"
                            disabled={isProcessingUrl}
                          />
                        </div>
                        <Button
                          onClick={handleUrlSubmit}
                          disabled={!urlInput.trim() || isProcessingUrl}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isProcessingUrl ? "Processing..." : "Scrape"}
                        </Button>
                      </div>
                    </div>

                    {/* Processing Status */}
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-white font-medium text-sm">Processing Status</h4>
                        <ScrollArea className="h-40">
                          {uploadedFiles.map((file) => (
                            <div key={file.id} className="bg-slate-700/50 rounded p-2 mb-2">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(file.status)}
                                  <span className="text-xs text-slate-300 truncate max-w-[150px]">{file.name}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(file.id)}
                                  className="h-5 w-5 p-0 text-slate-400 hover:text-white"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              {file.status === "uploading" && <Progress value={file.progress} className="h-1" />}
                              {file.status === "processing" && (
                                <div className="text-xs text-blue-400">Processing with AI...</div>
                              )}
                              {file.status === "completed" && (
                                <div className="text-xs text-green-400">✓ Ready for review</div>
                              )}
                              {file.status === "duplicate" && (
                                <div className="text-xs text-yellow-400">⚠ Duplicate of {file.duplicateOf}</div>
                              )}
                              {file.status === "error" && <div className="text-xs text-red-400">✗ {file.error}</div>}
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}

                    {/* Processed Data List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-medium text-sm flex items-center">
                          <Database className="h-4 w-4 mr-2" />
                          Processed Data ({allFiles.length})
                        </h4>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-6 w-6 p-0">
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>

                      <ScrollArea className="h-48">
                        {allFiles.length > 0 ? (
                          <div className="space-y-1">
                            {allFiles.map((file) => (
                              <div
                                key={file.id}
                                className={`p-2 border rounded cursor-pointer transition-colors ${
                                  selectedFile?.id === file.id
                                    ? "border-blue-500 bg-blue-500/10"
                                    : "border-slate-600 hover:border-slate-500 bg-slate-700/30"
                                }`}
                                onClick={() => setSelectedFile(file)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="h-3 w-3 text-blue-400" />
                                    <span className="text-white text-xs font-medium truncate max-w-[120px]">
                                      {file.name}
                                    </span>
                                  </div>
                                  {getDbStatusBadge(file.status)}
                                </div>
                                <div className="flex items-center space-x-1 mt-1">
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-slate-500 text-slate-300 px-1 py-0"
                                  >
                                    {file.type?.replace("-", " ") || "unknown"}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-slate-500 text-slate-300 px-1 py-0"
                                  >
                                    {file.source?.replace("-", " ") || "unknown"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <FileText className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                            <p className="text-slate-400 text-xs">No files processed yet</p>
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
                      Review processed content as plain text and confirm for training
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedFile ? (
                      <div className="space-y-4">
                        <ScrollArea className="h-[calc(100vh-450px)]">
                          <div className="space-y-4">
                            {/* File Info */}
                            <div className="bg-slate-700/30 p-3 rounded border border-slate-600">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-white font-medium text-sm">{selectedFile.name}</h3>
                                {getDbStatusBadge(selectedFile.status)}
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-slate-400">
                                <span>Type: {selectedFile.type?.replace("-", " ")}</span>
                                <span>•</span>
                                <span>Source: {selectedFile.source?.replace("-", " ")}</span>
                                <span>•</span>
                                <span>Added: {new Date(selectedFile.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Extracted Title */}
                            <div>
                              <Label className="text-slate-300 text-xs font-medium">Extracted Title</Label>
                              <div className="mt-1 p-2 bg-slate-700/50 rounded border border-slate-600">
                                <p className="text-white text-sm">
                                  {selectedFile.extracted_data?.title || selectedFile.name}
                                </p>
                              </div>
                            </div>

                            {/* Summary */}
                            <div>
                              <Label className="text-slate-300 text-xs font-medium">AI-Generated Summary</Label>
                              <div className="mt-1 p-2 bg-slate-700/50 rounded border border-slate-600">
                                <p className="text-white text-sm leading-relaxed">
                                  {selectedFile.extracted_data?.summary || "No summary available"}
                                </p>
                              </div>
                            </div>

                            {/* Key Points */}
                            <div>
                              <Label className="text-slate-300 text-xs font-medium">Key Points Extracted</Label>
                              <div className="mt-1 p-2 bg-slate-700/50 rounded border border-slate-600">
                                <ul className="space-y-1">
                                  {selectedFile.extracted_data?.keyPoints?.map((point: string, index: number) => (
                                    <li key={index} className="text-white text-sm flex items-start space-x-2">
                                      <span className="text-blue-400 mt-1">•</span>
                                      <span>{point}</span>
                                    </li>
                                  )) || <li className="text-slate-400 text-sm">No key points extracted</li>}
                                </ul>
                              </div>
                            </div>

                            {/* Applied Labels */}
                            <div>
                              <Label className="text-slate-300 text-xs font-medium">Applied Labels</Label>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {selectedFile.labels?.map((label: string) => (
                                  <Badge
                                    key={label}
                                    variant="secondary"
                                    className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"
                                  >
                                    {label}
                                  </Badge>
                                )) || <span className="text-slate-400 text-xs">No labels applied</span>}
                              </div>
                            </div>

                            {/* Raw Content Preview */}
                            <div>
                              <Label className="text-slate-300 text-xs font-medium">Raw Content (Plain Text)</Label>
                              <div className="mt-1 p-2 bg-slate-700/50 rounded border border-slate-600 max-h-40 overflow-y-auto">
                                <pre className="text-white text-xs whitespace-pre-wrap font-mono leading-relaxed">
                                  {selectedFile.original_content?.substring(0, 1000) || "No content available"}
                                  {selectedFile.original_content?.length > 1000 && "..."}
                                </pre>
                              </div>
                            </div>

                            {/* Structured Data Preview */}
                            {selectedFile.extracted_data?.extractedData && (
                              <div>
                                <Label className="text-slate-300 text-xs font-medium">Structured Data</Label>
                                <div className="mt-1 p-2 bg-slate-700/50 rounded border border-slate-600">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {Object.entries(selectedFile.extracted_data.extractedData).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="text-slate-400">{key}:</span>
                                        <span className="text-white ml-1">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollArea>

                        {/* Action Buttons */}
                        {isAdmin && (selectedFile.status === "pending" || selectedFile.status === "ready") && (
                          <div className="border-t border-slate-600 pt-3">
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => approveFile(selectedFile.id)}
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              >
                                ✓ Approve for Training
                              </Button>
                              <Button
                                onClick={() => rejectFile(selectedFile.id)}
                                variant="outline"
                                size="sm"
                                className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                              >
                                ✗ Reject
                              </Button>
                            </div>
                          </div>
                        )}

                        {selectedFile.status === "approved" && (
                          <div className="border-t border-slate-600 pt-3">
                            <div className="bg-green-900/20 border border-green-500/30 rounded p-2 text-center">
                              <p className="text-green-400 text-xs">✓ Approved for next training cycle</p>
                            </div>
                          </div>
                        )}

                        {selectedFile.status === "rejected" && (
                          <div className="border-t border-slate-600 pt-3">
                            <div className="bg-red-900/20 border border-red-500/30 rounded p-2 text-center">
                              <p className="text-red-400 text-xs">✗ Rejected - will not be used for training</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Select a file to review</p>
                        <p className="text-xs text-slate-500 mt-1">
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
                  <CardDescription className="text-slate-400">Data processing and training metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                      <div className="text-2xl font-bold text-blue-400">{allFiles.length}</div>
                      <div className="text-sm text-slate-400">Total Processed</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 p-4 rounded-lg border border-green-500/20">
                      <div className="text-2xl font-bold text-green-400">{approvedFiles.length}</div>
                      <div className="text-sm text-slate-400">Approved for Training</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
                      <div className="text-2xl font-bold text-yellow-400">{pendingFiles.length}</div>
                      <div className="text-sm text-slate-400">Pending Review</div>
                    </div>
                  </div>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Detailed analytics coming soon...</p>
                  </div>
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
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Quality metrics dashboard coming soon...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Training Settings</CardTitle>
                  <CardDescription className="text-slate-400">
                    Configure training schedule and data processing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-medium">Training Schedule</h3>
                        <p className="text-sm text-slate-400">How often should the model be retrained?</p>
                      </div>
                      <Select value={trainingSchedule} onValueChange={handleTrainingScheduleChange}>
                        <SelectTrigger className="w-32 bg-slate-700 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TRAINING_SCHEDULES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-medium">Auto-approval</h3>
                        <p className="text-sm text-slate-400">Automatically approve high-quality content</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                        disabled={!isAdmin}
                      >
                        {isAdmin ? "Configure" : "Admin Only"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-medium">Duplicate Detection</h3>
                        <p className="text-sm text-slate-400">Prevent duplicate content from being processed</p>
                      </div>
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                        Enabled
                      </Badge>
                    </div>

                    <div className="border-t border-slate-700 pt-4">
                      <h3 className="text-white font-medium mb-2">Next Training Window</h3>
                      <div className="bg-slate-700/30 p-3 rounded border border-slate-600">
                        <div className="flex items-center space-x-2 text-sm">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          <span className="text-white">{nextTrainingDate.toLocaleDateString()} at 2:00 AM UTC</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{approvedFiles.length} files ready for training</p>
                      </div>
                    </div>
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
