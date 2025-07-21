// Simulated AI processing function
export async function processWithAI(content: string, filename: string) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Generate mock processed data based on filename
  const isVeterinary =
    filename.toLowerCase().includes("veterinary") ||
    filename.toLowerCase().includes("animal") ||
    filename.toLowerCase().includes("anesthesia")

  return {
    title: isVeterinary
      ? `Medical Study: ${filename.replace(".txt", "").replace(".pdf", "")}`
      : `Research Paper: ${filename.replace(".txt", "").replace(".pdf", "")}`,
    summary: isVeterinary
      ? "This medical journal article presents research findings on clinical outcomes and treatment efficacy for veterinary anesthesia protocols and techniques."
      : "This research paper presents findings on clinical outcomes and treatment methodologies.",
    keyPoints: isVeterinary
      ? [
          "Study methodology and patient demographics",
          "Primary and secondary endpoints",
          "Statistical analysis and results",
          "Clinical implications and recommendations",
        ]
      : ["Research methodology and data collection", "Analysis and findings", "Conclusions and recommendations"],
    metadata: {
      studyType: "Clinical Trial",
      sampleSize: "N=245",
      duration: "12 months",
      primaryEndpoint: "Treatment efficacy",
    },
  }
}
