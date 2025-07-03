import type { ProcessedData } from "./supabase"

interface DuplicateCheckOptions {
  checkName?: boolean
  checkContent?: boolean
  contentThreshold?: number
  caseSensitive?: boolean
}

interface DuplicateResult {
  isDuplicate: boolean
  existingFile?: string
  reason?: string
}

export async function customDuplicateCheck(
  name: string,
  content: string,
  existingData: ProcessedData[],
  options: DuplicateCheckOptions = {},
): Promise<DuplicateResult> {
  const { checkName = true, checkContent = true, contentThreshold = 0.8, caseSensitive = false } = options

  const normalizedName = caseSensitive ? name : name.toLowerCase()
  const normalizedContent = caseSensitive ? content : content.toLowerCase()

  for (const existingDoc of existingData) {
    // Check name similarity if enabled
    if (checkName) {
      const existingName = caseSensitive ? existingDoc.name : existingDoc.name.toLowerCase()

      // Exact match
      if (normalizedName === existingName) {
        return {
          isDuplicate: true,
          existingFile: existingDoc.name,
          reason: "Exact filename match",
        }
      }

      // Similar name check (Levenshtein distance)
      const similarity = calculateStringSimilarity(normalizedName, existingName)
      if (similarity > 0.85) {
        return {
          isDuplicate: true,
          existingFile: existingDoc.name,
          reason: `Similar filename (${Math.round(similarity * 100)}% match)`,
        }
      }
    }

    // Check content similarity if enabled
    if (checkContent) {
      const existingContent = caseSensitive ? existingDoc.original_content : existingDoc.original_content.toLowerCase()

      // Skip very short content
      if (normalizedContent.length < 100 || existingContent.length < 100) {
        continue
      }

      const contentSimilarity = calculateContentSimilarity(normalizedContent, existingContent)
      if (contentSimilarity > contentThreshold) {
        return {
          isDuplicate: true,
          existingFile: existingDoc.name,
          reason: `Similar content (${Math.round(contentSimilarity * 100)}% match)`,
        }
      }
    }
  }

  return { isDuplicate: false }
}

// Calculate string similarity using Levenshtein distance
function calculateStringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0) return len2 === 0 ? 1 : 0
  if (len2 === 0) return 0

  const matrix = Array(len2 + 1)
    .fill(null)
    .map(() => Array(len1 + 1).fill(null))

  for (let i = 0; i <= len1; i++) matrix[0][i] = i
  for (let j = 0; j <= len2; j++) matrix[j][0] = j

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1, // deletion
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i - 1] + cost, // substitution
      )
    }
  }

  const maxLen = Math.max(len1, len2)
  return (maxLen - matrix[len2][len1]) / maxLen
}

// Calculate content similarity using Jaccard similarity
function calculateContentSimilarity(content1: string, content2: string): number {
  // Remove common words and split into meaningful tokens
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
  ])

  const getTokens = (text: string) => {
    return text
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .map((word) => word.toLowerCase())
  }

  const tokens1 = new Set(getTokens(content1))
  const tokens2 = new Set(getTokens(content2))

  if (tokens1.size === 0 && tokens2.size === 0) return 1
  if (tokens1.size === 0 || tokens2.size === 0) return 0

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)))
  const union = new Set([...tokens1, ...tokens2])

  return intersection.size / union.size
}
