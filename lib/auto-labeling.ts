// Automated document labeling based on content analysis
export interface DocumentAnalysis {
  detectedLabels: string[]
  confidence: Record<string, number>
  documentType: string
  qualityScore: number
}

export async function analyzeDocument(filename: string, content: string): Promise<DocumentAnalysis> {
  // Simulate AI processing delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  const lowerContent = content.toLowerCase()
  const lowerFilename = filename.toLowerCase()

  const detectedLabels: string[] = []
  const confidence: Record<string, number> = {}

  // Document type detection patterns
  const patterns = {
    // Academic & Research
    "peer-reviewed-journal": [
      "abstract",
      "methodology",
      "results",
      "discussion",
      "conclusion",
      "references",
      "doi:",
      "journal",
      "volume",
      "issue",
      "pmid",
      "pubmed",
    ],
    "research-paper": [
      "research",
      "study",
      "analysis",
      "findings",
      "hypothesis",
      "literature review",
      "data collection",
      "statistical",
    ],
    "case-study": ["case study", "patient", "clinical case", "diagnosis", "treatment", "outcome", "follow-up"],
    "review-article": ["systematic review", "meta-analysis", "literature review", "overview", "comprehensive review"],

    // Educational Materials
    textbook: [
      "chapter",
      "edition",
      "isbn",
      "publisher",
      "learning objectives",
      "summary",
      "key concepts",
      "exercises",
      "problems",
    ],
    "lecture-notes": ["lecture", "notes", "slides", "presentation", "course", "university", "professor", "class"],
    tutorial: ["step by step", "how to", "guide", "tutorial", "instructions", "beginner", "advanced", "learn"],

    // Professional & Industry
    "clinical-guideline": [
      "guideline",
      "protocol",
      "recommendation",
      "standard of care",
      "best practice",
      "clinical practice",
      "evidence-based",
    ],
    "technical-manual": [
      "manual",
      "handbook",
      "technical",
      "procedure",
      "operation",
      "maintenance",
      "troubleshooting",
      "specifications",
    ],
    "white-paper": [
      "white paper",
      "whitepaper",
      "industry report",
      "market analysis",
      "technical report",
      "position paper",
    ],

    // Web & Digital Content
    "blog-post": ["blog", "posted by", "comments", "tags", "share", "like", "subscribe", "social media"],
    "news-article": ["breaking news", "reporter", "published", "press release", "news", "journalist", "editorial"],
    "wiki-article": ["wikipedia", "wiki", "edit", "contributors", "references", "external links", "disambiguation"],

    // Veterinary Specific
    "veterinary-journal": [
      "veterinary",
      "animal",
      "canine",
      "feline",
      "equine",
      "bovine",
      "small animal",
      "large animal",
      "veterinarian",
      "vet",
    ],
    "animal-care-guide": [
      "pet care",
      "animal care",
      "feeding",
      "grooming",
      "health",
      "vaccination",
      "preventive care",
      "wellness",
    ],
    "surgical-procedure": [
      "surgery",
      "surgical",
      "procedure",
      "anesthesia",
      "post-operative",
      "sterile",
      "incision",
      "suture",
    ],

    // Content Quality Indicators
    "high-quality": [
      "peer-reviewed",
      "evidence-based",
      "clinical trial",
      "randomized",
      "controlled study",
      "meta-analysis",
      "systematic review",
    ],
    educational: ["learning", "education", "training", "course", "curriculum", "teaching", "student", "academic"],
    "reference-material": ["reference", "handbook", "encyclopedia", "dictionary", "atlas", "compendium", "guide"],
  }

  // Analyze content for patterns
  for (const [label, keywords] of Object.entries(patterns)) {
    let matches = 0
    const totalKeywords = keywords.length

    for (const keyword of keywords) {
      if (lowerContent.includes(keyword) || lowerFilename.includes(keyword)) {
        matches++
      }
    }

    const confidenceScore = matches / totalKeywords

    if (confidenceScore > 0.1) {
      // 10% threshold
      confidence[label] = Math.round(confidenceScore * 100)

      if (confidenceScore > 0.2) {
        // 20% threshold for inclusion
        detectedLabels.push(label)
      }
    }
  }

  // Determine primary document type
  let documentType = "general-document"
  let highestConfidence = 0

  for (const [label, conf] of Object.entries(confidence)) {
    if (conf > highestConfidence && !["high-quality", "educational", "reference-material"].includes(label)) {
      highestConfidence = conf
      documentType = label
    }
  }

  // Calculate quality score
  const qualityScore = calculateQualityScore(content, detectedLabels, confidence)

  return {
    detectedLabels: detectedLabels.slice(0, 8), // Limit to top 8 labels
    confidence,
    documentType,
    qualityScore,
  }
}

function calculateQualityScore(content: string, labels: string[], confidence: Record<string, number>): number {
  let score = 0

  // Content length score (0-25 points)
  const contentLength = content.length
  if (contentLength > 5000) score += 25
  else if (contentLength > 2000) score += 20
  else if (contentLength > 1000) score += 15
  else if (contentLength > 500) score += 10
  else score += 5

  // Label diversity score (0-25 points)
  const labelCount = labels.length
  score += Math.min(labelCount * 5, 25)

  // Quality indicators (0-25 points)
  const qualityLabels = ["high-quality", "peer-reviewed-journal", "clinical-guideline", "research-paper"]
  const qualityBonus = qualityLabels.reduce((bonus, label) => {
    return bonus + (confidence[label] || 0) / 4
  }, 0)
  score += Math.min(qualityBonus, 25)

  // Structure and formatting (0-25 points)
  const structureIndicators = [
    "abstract",
    "introduction",
    "methodology",
    "results",
    "discussion",
    "conclusion",
    "references",
    "bibliography",
    "table",
    "figure",
    "chart",
  ]

  const lowerContent = content.toLowerCase()
  const structureScore = structureIndicators.reduce((acc, indicator) => {
    return acc + (lowerContent.includes(indicator) ? 3 : 0)
  }, 0)
  score += Math.min(structureScore, 25)

  return Math.min(Math.round(score), 100)
}

// Export utility function for formatting labels
export function formatLabel(label: string): string {
  return label
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Get suggested labels based on veterinary focus
export function getVeterinaryLabels(): string[] {
  return [
    "clinical-research",
    "animal-behavior",
    "diagnostic-imaging",
    "pharmacology",
    "surgery",
    "internal-medicine",
    "emergency-care",
    "preventive-medicine",
    "nutrition",
    "pathology",
    "anesthesia",
    "cardiology",
    "dermatology",
    "neurology",
    "oncology",
  ]
}
