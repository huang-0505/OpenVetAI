// Simulated AI processing for veterinary content
export async function processVeterinaryContent(content: string, filename: string) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Mock AI processing results
  const mockResults = {
    summary: `AI-generated summary of ${filename}`,
    keywords: ["veterinary", "research", "analysis"],
    entities: [
      { type: "organization", value: "Veterinary Research Institute" },
      { type: "location", value: "Laboratory" },
      { type: "date", value: new Date().toISOString().split("T")[0] },
    ],
    sentiment: "neutral",
    confidence: 0.85,
    wordCount: content.split(" ").length,
    language: "en",
    topics: ["veterinary medicine", "research methodology"],
    extractedData: {
      title: filename.replace(/\.[^/.]+$/, ""),
      content: content.substring(0, 500) + (content.length > 500 ? "..." : ""),
      metadata: {
        processedAt: new Date().toISOString(),
        processingTime: "2.3s",
        aiModel: "veterinary-analysis-v1",
      },
    },
  }

  return mockResults
}

// Alias so other modules can import the same logic with a clearer name
export const processWithAI = processVeterinaryContent
