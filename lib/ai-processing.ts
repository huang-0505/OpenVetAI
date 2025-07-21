// Simulated AI processing function
export async function processWithAI(content: string, filename: string) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Mock AI analysis results
  return {
    title: `AI-generated title for ${filename.replace(/\.[^/.]+$/, "")}`,
    summary: `AI-generated summary for ${filename}: This document contains veterinary research data with key findings about animal health and treatment protocols. The analysis shows comprehensive medical information suitable for training purposes.`,
    keyPoints: [
      "Contains veterinary research data and clinical findings",
      "Includes treatment protocols and diagnostic procedures",
      "References evidence-based medical practices",
      "Provides clinical recommendations and guidelines",
    ],
    metadata: {
      studyType: "Clinical Research",
      confidence: (Math.random() * 0.3 + 0.7).toFixed(2), // Random confidence between 0.7-1.0
      wordCount: content.split(" ").length,
      language: "English",
      fileType: filename.split(".").pop() || "unknown",
    },
    extractedEntities: ["veterinary medicine", "animal health", "clinical research"],
  }
}
