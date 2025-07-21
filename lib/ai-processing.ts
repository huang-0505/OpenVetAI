// Simulated AI processing function
export async function processWithAI(content: string, filename: string) {
  // Simulate AI processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Mock AI analysis results
  const mockAnalysis = {
    title: filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
    summary: `This document contains ${content.length} characters of text content. The analysis shows it contains veterinary-related information with key medical terminology and research data. The document appears to be a ${detectDocumentType(content)} with structured information suitable for medical research purposes.`,
    keyPoints: [
      "Contains veterinary medical terminology and procedures",
      "Includes structured data suitable for research analysis",
      "Document shows clinical or research-oriented content",
      "Text formatting suggests professional medical documentation",
      `File size: ${content.length} characters`,
    ],
    metadata: {
      documentType: detectDocumentType(content),
      wordCount: content.split(/\s+/).length,
      characterCount: content.length,
      estimatedReadingTime: `${Math.ceil(content.split(/\s+/).length / 200)} minutes`,
      language: "English",
      confidence: "85%",
    },
  }

  return mockAnalysis
}

function detectDocumentType(content: string): string {
  const lowerContent = content.toLowerCase()

  if (lowerContent.includes("abstract") || lowerContent.includes("methodology")) {
    return "Research Paper"
  } else if (lowerContent.includes("patient") || lowerContent.includes("diagnosis")) {
    return "Clinical Study"
  } else if (lowerContent.includes("case") || lowerContent.includes("treatment")) {
    return "Case Report"
  } else if (lowerContent.includes("veterinary") || lowerContent.includes("animal")) {
    return "Veterinary Document"
  } else {
    return "General Document"
  }
}
