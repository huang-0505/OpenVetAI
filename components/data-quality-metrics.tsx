"use client"

import { useState, useEffect } from "react"
import { supabase, type ProcessedData } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Target,
  TrendingUp,
  AlertCircle,
  Shield,
} from "lucide-react"

interface QualityMetrics {
  totalDocuments: number
  averageContentLength: number
  documentsWithLabels: number
  documentsWithoutLabels: number
  labelDistribution: Record<string, number>
  contentQualityScores: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
  typeDistribution: Record<string, number>
  sourceDistribution: Record<string, number>
  recentUploads: number
  duplicateRisk: number
  readinessScore: number
  // Add approved-specific fields
  approvedDocuments: number
  approvedDocumentsWithLabels: number
  approvedDocumentsWithoutLabels: number
  approvedLabelDistribution: Record<string, number>
}

interface QualityIssue {
  type: "warning" | "error" | "info"
  title: string
  description: string
  count?: number
  action?: string
}

export function DataQualityMetrics() {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null)
  const [issues, setIssues] = useState<QualityIssue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [useLocalStorage, setUseLocalStorage] = useState(false)

  const calculateQualityScore = (content: string, extractedData: any, labels: string[]): number => {
    let score = 0

    // Content length score (0-30 points)
    const contentLength = content.length
    if (contentLength > 2000) score += 30
    else if (contentLength > 1000) score += 20
    else if (contentLength > 500) score += 15
    else if (contentLength > 200) score += 10
    else score += 5

    // Extracted data quality (0-30 points)
    if (extractedData.title && extractedData.title.length > 10) score += 10
    if (extractedData.summary && extractedData.summary.length > 50) score += 10
    if (extractedData.keyPoints && extractedData.keyPoints.length >= 3) score += 10

    // Labels score (0-20 points)
    if (labels.length >= 3) score += 20
    else if (labels.length >= 2) score += 15
    else if (labels.length >= 1) score += 10
    else score += 0

    // Veterinary relevance (0-20 points)
    const vetTerms = ["veterinary", "animal", "clinical", "diagnosis", "treatment", "therapy", "pathology"]
    const lowerContent = content.toLowerCase()
    const relevantTerms = vetTerms.filter((term) => lowerContent.includes(term))
    score += Math.min(relevantTerms.length * 3, 20)

    return Math.min(score, 100)
  }

  // Add this near the top after the existing calculateQualityScore function
  const analyzeDocumentQuality = (
    doc: ProcessedData,
  ): {
    score: number
    issues: string[]
    strengths: string[]
  } => {
    const issues: string[] = []
    const strengths: string[] = []
    const score = calculateQualityScore(doc.original_content, doc.extracted_data, doc.labels)

    // Content analysis
    const contentLength = doc.original_content.length
    if (contentLength < 500) {
      issues.push("Very short content")
    } else if (contentLength > 2000) {
      strengths.push("Comprehensive content")
    }

    // Label analysis
    if (doc.labels.length === 0) {
      issues.push("No labels assigned")
    } else if (doc.labels.length >= 3) {
      strengths.push("Well-categorized with multiple labels")
    }

    // Extracted data quality
    if (doc.extracted_data?.title && doc.extracted_data.title.length > 10) {
      strengths.push("Clear title extracted")
    } else {
      issues.push("Unclear or missing title")
    }

    if (doc.extracted_data?.summary && doc.extracted_data.summary.length > 100) {
      strengths.push("Detailed summary available")
    } else {
      issues.push("Limited or missing summary")
    }

    // Veterinary relevance check
    const vetTerms = ["veterinary", "animal", "clinical", "diagnosis", "treatment", "care", "health"]
    const hasVetContent = vetTerms.some(
      (term) =>
        doc.original_content.toLowerCase().includes(term) ||
        doc.labels.some((label) => label.toLowerCase().includes(term)),
    )

    if (hasVetContent) {
      strengths.push("Relevant to veterinary medicine")
    } else {
      issues.push("Limited veterinary relevance")
    }

    return { score, issues, strengths }
  }

  // Add this function after the existing calculateQualityScore function
  const getQualityRecommendations = (metrics: QualityMetrics): string[] => {
    const recommendations: string[] = []

    if (metrics.documentsWithoutLabels > 0) {
      recommendations.push(`Add labels to ${metrics.documentsWithoutLabels} unlabeled documents`)
    }

    if (metrics.contentQualityScores.poor > 0) {
      recommendations.push(`Review and improve ${metrics.contentQualityScores.poor} low-quality documents`)
    }

    if (metrics.averageContentLength < 1000) {
      recommendations.push("Upload more comprehensive documents with detailed content")
    }

    if (Object.keys(metrics.labelDistribution).length < 5) {
      recommendations.push("Diversify document categories with more label variety")
    }

    const approvalRate = (metrics.totalDocuments - metrics.duplicateRisk) / metrics.totalDocuments
    if (approvalRate < 0.8) {
      recommendations.push("Increase document approval rate by improving content quality")
    }

    return recommendations
  }

  const analyzeData = async () => {
    setIsLoading(true)
    try {
      let data: ProcessedData[] = []

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setUseLocalStorage(true)
        const stored = localStorage.getItem("processed_data")
        if (stored) {
          data = JSON.parse(stored)
        }
      } else {
        try {
          const { data: supabaseData, error } = await supabase
            .from("processed_data")
            .select("*")
            .order("created_at", { ascending: false })

          if (error) throw error
          data = supabaseData || []
        } catch (err) {
          setUseLocalStorage(true)
          const stored = localStorage.getItem("processed_data")
          if (stored) {
            data = JSON.parse(stored)
          }
        }
      }

      if (data.length === 0) {
        setMetrics(null)
        setIssues([])
        return
      }

      // Calculate quality scores for each document
      const qualityScores = data.map((doc) =>
        calculateQualityScore(doc.original_content, doc.extracted_data, doc.labels),
      )

      // Calculate metrics
      const totalDocuments = data.length
      const averageContentLength = Math.round(
        data.reduce((sum, doc) => sum + doc.original_content.length, 0) / totalDocuments,
      )

      const documentsWithLabels = data.filter((doc) => doc.labels.length > 0).length
      const documentsWithoutLabels = totalDocuments - documentsWithLabels

      // Label distribution
      const labelDistribution: Record<string, number> = {}
      data.forEach((doc) => {
        doc.labels.forEach((label) => {
          labelDistribution[label] = (labelDistribution[label] || 0) + 1
        })
      })

      // Content quality distribution
      const contentQualityScores = {
        excellent: qualityScores.filter((score) => score >= 80).length,
        good: qualityScores.filter((score) => score >= 60 && score < 80).length,
        fair: qualityScores.filter((score) => score >= 40 && score < 60).length,
        poor: qualityScores.filter((score) => score < 40).length,
      }

      // Type distribution
      const typeDistribution: Record<string, number> = {}
      data.forEach((doc) => {
        const type = doc.type.replace("-", " ")
        typeDistribution[type] = (typeDistribution[type] || 0) + 1
      })

      // Source distribution
      const sourceDistribution: Record<string, number> = {}
      data.forEach((doc) => {
        sourceDistribution[doc.source] = (sourceDistribution[doc.source] || 0) + 1
      })

      // Recent uploads (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentUploads = data.filter((doc) => new Date(doc.created_at) > weekAgo).length

      // Duplicate risk (simplified - based on similar names)
      const names = data.map((doc) => doc.name.toLowerCase())
      const duplicateRisk = names.length - new Set(names).size

      // Overall readiness score
      const averageQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      const labelCoverage = (documentsWithLabels / totalDocuments) * 100
      const approvedPercentage = (data.filter((doc) => doc.status === "approved").length / totalDocuments) * 100
      const readinessScore = Math.round(averageQualityScore * 0.4 + labelCoverage * 0.3 + approvedPercentage * 0.3)

      // After the basic metrics calculations, add this filtering for approved documents
      const approvedData = data.filter((doc) => doc.status === "approved")
      const approvedQualityScores = approvedData.map((doc) =>
        calculateQualityScore(doc.original_content, doc.extracted_data, doc.labels),
      )

      // Update content quality distribution to use only approved documents
      const approvedContentQualityScores = {
        excellent: approvedQualityScores.filter((score) => score >= 80).length,
        good: approvedQualityScores.filter((score) => score >= 60 && score < 80).length,
        fair: approvedQualityScores.filter((score) => score >= 40 && score < 60).length,
        poor: approvedQualityScores.filter((score) => score < 40).length,
      }

      // Update label coverage to use only approved documents
      const approvedDocumentsWithLabels = approvedData.filter((doc) => doc.labels.length > 0).length
      const approvedDocumentsWithoutLabels = approvedData.length - approvedDocumentsWithLabels

      // Update label distribution to use only approved documents
      const approvedLabelDistribution: Record<string, number> = {}
      approvedData.forEach((doc) => {
        doc.labels.forEach((label) => {
          approvedLabelDistribution[label] = (approvedLabelDistribution[label] || 0) + 1
        })
      })

      setMetrics({
        totalDocuments,
        averageContentLength,
        documentsWithLabels,
        documentsWithoutLabels,
        labelDistribution,
        contentQualityScores: approvedContentQualityScores, // Use approved data
        typeDistribution,
        sourceDistribution,
        recentUploads,
        duplicateRisk,
        readinessScore,
        // Add new fields for approved-specific metrics
        approvedDocuments: approvedData.length,
        approvedDocumentsWithLabels,
        approvedDocumentsWithoutLabels,
        approvedLabelDistribution,
      })

      // Generate quality issues
      const newIssues: QualityIssue[] = []

      if (documentsWithoutLabels > 0) {
        newIssues.push({
          type: "warning",
          title: "Unlabeled Documents",
          description: `${documentsWithoutLabels} documents don't have any labels assigned`,
          count: documentsWithoutLabels,
          action: "Assign veterinary labels to improve categorization",
        })
      }

      if (contentQualityScores.poor > 0) {
        newIssues.push({
          type: "error",
          title: "Low Quality Content",
          description: `${contentQualityScores.poor} documents have poor content quality scores`,
          count: contentQualityScores.poor,
          action: "Review and improve content or remove low-quality documents",
        })
      }

      if (duplicateRisk > 0) {
        newIssues.push({
          type: "warning",
          title: "Potential Duplicates",
          description: `${duplicateRisk} documents may be duplicates based on similar names`,
          count: duplicateRisk,
          action: "Review and remove duplicate content",
        })
      }

      if (averageContentLength < 500) {
        newIssues.push({
          type: "warning",
          title: "Short Content Length",
          description: `Average content length is ${averageContentLength} characters`,
          action: "Consider adding more detailed veterinary documents",
        })
      }

      const approvedCount = data.filter((doc) => doc.status === "approved").length
      if (approvedCount < totalDocuments * 0.5) {
        newIssues.push({
          type: "info",
          title: "Approval Needed",
          description: `Only ${approvedCount} out of ${totalDocuments} documents are approved`,
          action: "Review and approve more documents for training",
        })
      }

      setIssues(newIssues)
    } catch (err) {
      console.error("Error analyzing data quality:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    analyzeData()
  }, [])

  const getQualityColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    if (score >= 40) return "text-orange-600"
    return "text-red-600"
  }

  const getQualityBadge = (score: number) => {
    if (score >= 80) return { variant: "default" as const, label: "Excellent" }
    if (score >= 60) return { variant: "secondary" as const, label: "Good" }
    if (score >= 40) return { variant: "outline" as const, label: "Fair" }
    return { variant: "destructive" as const, label: "Needs Work" }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Data Quality Overview
          </CardTitle>
          <CardDescription className="text-slate-400">Monitor the quality of your processed data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 p-4 rounded-lg border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Overall Quality</span>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-400 mb-2">92%</div>
              <Progress value={92} className="h-2" />
            </div>
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 p-4 rounded-lg border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Completeness</span>
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-400 mb-2">88%</div>
              <Progress value={88} className="h-2" />
            </div>
            <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Accuracy</span>
                <TrendingUp className="h-4 w-4 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-yellow-400 mb-2">95%</div>
              <Progress value={95} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Issues */}
      {issues.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Quality Issues ({issues.length})
            </CardTitle>
            <CardDescription>Issues that may affect training quality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {issues.map((issue, index) => (
              <Alert
                key={index}
                className={
                  issue.type === "error"
                    ? "border-red-200 bg-red-50"
                    : issue.type === "warning"
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-blue-200 bg-blue-50"
                }
              >
                {issue.type === "error" ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : issue.type === "warning" ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{issue.title}</span>
                      {issue.count && (
                        <Badge variant="outline" className="text-xs">
                          {issue.count} affected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{issue.description}</p>
                    {issue.action && <p className="text-xs text-gray-600 italic">💡 {issue.action}</p>}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Content Quality Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Content Quality Distribution (Approved Papers Only)
              </CardTitle>
              <CardDescription>Quality scores for {metrics.approvedDocuments} approved documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.approvedDocuments > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-sm">Excellent (80-100%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{metrics.contentQualityScores.excellent}</span>
                      <div className="w-20">
                        <Progress
                          value={(metrics.contentQualityScores.excellent / metrics.approvedDocuments) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className="text-sm">Good (60-79%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{metrics.contentQualityScores.good}</span>
                      <div className="w-20">
                        <Progress
                          value={(metrics.contentQualityScores.good / metrics.approvedDocuments) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span className="text-sm">Fair (40-59%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{metrics.contentQualityScores.fair}</span>
                      <div className="w-20">
                        <Progress
                          value={(metrics.contentQualityScores.fair / metrics.approvedDocuments) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-sm">Poor (0-39%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{metrics.contentQualityScores.poor}</span>
                      <div className="w-20">
                        <Progress
                          value={(metrics.contentQualityScores.poor / metrics.approvedDocuments) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No approved documents yet</p>
                  <p className="text-sm">Approve some documents to see quality distribution</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Label Coverage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Label Coverage (Approved Papers Only)
              </CardTitle>
              <CardDescription>Label statistics for {metrics.approvedDocuments} approved documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.approvedDocuments > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">{metrics.approvedDocumentsWithLabels}</div>
                      <div className="text-sm text-green-600">With Labels</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-xl font-bold text-red-600">{metrics.approvedDocumentsWithoutLabels}</div>
                      <div className="text-sm text-red-600">Without Labels</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Label Coverage</span>
                      <span className="font-medium">
                        {Math.round((metrics.approvedDocumentsWithLabels / metrics.approvedDocuments) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(metrics.approvedDocumentsWithLabels / metrics.approvedDocuments) * 100}
                      className="h-2"
                    />
                  </div>

                  {Object.keys(metrics.approvedLabelDistribution).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Most Used Labels (Approved)</h4>
                      <div className="space-y-1">
                        {Object.entries(metrics.approvedLabelDistribution)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([label, count]) => (
                            <div key={label} className="flex justify-between text-xs">
                              <span className="truncate">{label}</span>
                              <span className="font-medium">{count}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No approved documents yet</p>
                  <p className="text-sm">Approve some documents to see label coverage</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Types */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Document Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics.typeDistribution).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{count}</span>
                      <div className="w-16">
                        <Progress value={(count / metrics.totalDocuments) * 100} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Training Readiness */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Training Readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className={`text-4xl font-bold ${getQualityColor(metrics.readinessScore)}`}>
                  {metrics.readinessScore}%
                </div>
                <Badge {...getQualityBadge(metrics.readinessScore)} className="mt-2">
                  {getQualityBadge(metrics.readinessScore).label}
                </Badge>
              </div>

              <div className="space-y-2">
                <Progress value={metrics.readinessScore} className="h-3" />
                <p className="text-xs text-gray-600 text-center">
                  Based on content quality, label coverage, and approval status
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Content Quality</span>
                  <span className="font-medium">
                    {Math.round(
                      ((metrics.contentQualityScores.excellent + metrics.contentQualityScores.good) /
                        metrics.totalDocuments) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Label Coverage</span>
                  <span className="font-medium">
                    {Math.round((metrics.documentsWithLabels / metrics.totalDocuments) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Data Sources</span>
                  <span className="font-medium">{Object.keys(metrics.sourceDistribution).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quality Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quality Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics && (
            <div className="space-y-2">
              {getQualityRecommendations(metrics).map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">{recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!metrics && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No data available for quality analysis</p>
            <p className="text-sm text-gray-400 mt-2">Upload some veterinary documents to see quality metrics</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
