// Simulated AI processing function
export async function processWithAI(content: string, filename: string) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Mock AI analysis results
  return {
    summary: `AI-generated summary for ${filename}: This document contains veterinary research data with key findings about animal health and treatment protocols.`,
    keyPoints: [
      "Contains veterinary research data",
      "Includes treatment protocols",
      "References animal health studies",
      "Provides clinical recommendations",
    ],
    metadata: {
      fileType: filename.split(".").pop() || "unknown",
      confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7-1.0
      wordCount: content.split(" ").length,
      language: "en",
    },
    extractedEntities: ["veterinary medicine", "animal health", "clinical research"],
  }
}
