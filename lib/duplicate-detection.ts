import type { ProcessedData } from "./supabase"

// Interface for duplicate check result
export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingFile?: string
  similarity?: number
  reason?: string
}

/**
 * Basic duplicate detection by filename
 * This is the default implementation that checks for exact filename matches
 */
export async function checkDuplicateByName(
  name: string,
  existingData: ProcessedData[],
  options = { caseSensitive: false, exactMatch: true },
): Promise<DuplicateCheckResult> {
  const normalizedName = options.caseSensitive ? name.trim() : name.toLowerCase().trim()

  const existing = existingData.find((data) => {
    const dataName = options.caseSensitive ? data.name.trim() : data.name.toLowerCase().trim()
    return options.exactMatch ? dataName === normalizedName : dataName.includes(normalizedName)
  })

  return {
    isDuplicate: !!existing,
    existingFile: existing?.name,
    reason: existing ? "Filename already exists" : undefined,
  }
}

/**
 * Advanced duplicate detection by content similarity
 * This implementation checks for content similarity using a simple algorithm
 */
export function checkDuplicateByContent(
  content: string,
  existingData: ProcessedData[],
  options = { threshold: 0.8, sampleSize: 1000 },
): DuplicateCheckResult {
  // Take a sample of the content for comparison (for performance)
  const contentSample = content.slice(0, options.sampleSize).toLowerCase()

  // Find the most similar content
  let highestSimilarity = 0
  let mostSimilarFile: ProcessedData | undefined

  for (const data of existingData) {
    const existingSample = data.original_content.slice(0, options.sampleSize).toLowerCase()
    const similarity = calculateSimilarity(contentSample, existingSample)

    if (similarity > highestSimilarity) {
      highestSimilarity = similarity
      mostSimilarFile = data
    }
  }

  // Check if similarity exceeds threshold
  const isDuplicate = highestSimilarity >= options.threshold

  return {
    isDuplicate,
    existingFile: mostSimilarFile?.name,
    similarity: highestSimilarity,
    reason: isDuplicate ? `Content is ${Math.round(highestSimilarity * 100)}% similar to existing file` : undefined,
  }
}

/**
 * Custom duplicate detection that combines multiple strategies
 * You can modify this function to implement your own custom logic
 */
export async function customDuplicateCheck(
  name: string,
  content: string,
  existingData: ProcessedData[],
  options = {
    checkName: true,
    checkContent: true,
    contentThreshold: 0.7,
    caseSensitive: false,
  },
): Promise<DuplicateCheckResult> {
  // Check by name first (faster)
  if (options.checkName) {
    const nameCheck = await checkDuplicateByName(name, existingData, {
      caseSensitive: options.caseSensitive,
      exactMatch: true,
    })

    if (nameCheck.isDuplicate) {
      return nameCheck
    }
  }

  // Then check by content if needed
  if (options.checkContent) {
    const contentCheck = checkDuplicateByContent(content, existingData, {
      threshold: options.contentThreshold,
      sampleSize: 1000,
    })

    if (contentCheck.isDuplicate) {
      return contentCheck
    }
  }

  // Add your own custom checks here!
  // For example, you could check for similar titles in the extracted data
  // or use more sophisticated text similarity algorithms

  return {
    isDuplicate: false,
  }
}

/**
 * Calculate similarity between two text strings
 * This is a simple Jaccard similarity implementation
 * You can replace this with more sophisticated algorithms
 */
function calculateSimilarity(text1: string, text2: string): number {
  // Simple implementation using word overlap (Jaccard similarity)
  const words1 = new Set(text1.split(/\s+/).filter(Boolean))
  const words2 = new Set(text2.split(/\s+/).filter(Boolean))

  // Find intersection and union
  const intersection = new Set([...words1].filter((word) => words2.has(word)))
  const union = new Set([...words1, ...words2])

  // Calculate Jaccard similarity
  return intersection.size / union.size
}

// -----------------------------------------------------------------------------
// Simple helper used by the client-side UI
// -----------------------------------------------------------------------------
// Accepts any objects that at least expose a `name` (string) and optional
// `content` (string). Returns a very lightweight duplicate report so that the
// UI does not have to know about the richer DuplicateCheckResult interface.

export interface SimpleDuplicateResult {
  isDuplicate: boolean
  duplicateOf?: string
}

/**
 * Extremely fast duplicate detector for the upload wizard.
 * 1. Case-insensitive filename match (exact)
 * 2. VERY cheap content check (first 1 kB Jaccard similarity ≥ 0.9)
 *
 * NOTE: For deeper / asynchronous checks the UI already calls the
 *       `customDuplicateCheck` server-side.  This helper prevents the
 *       “duplicate” badge from crashing the page during optimistic UI updates.
 */
export function detectDuplicates<T extends { name: string; content?: string }>(
  file: T,
  existing: T[],
  contentThreshold = 0.9,
): SimpleDuplicateResult {
  // ---- 1️⃣  filename --------------------------------------------------------
  const fn = file.name.toLowerCase().trim()
  const byName = existing.find((f) => f.name.toLowerCase().trim() === fn)
  if (byName) {
    return { isDuplicate: true, duplicateOf: byName.name }
  }

  // ---- 2️⃣  cheap content similarity ---------------------------------------
  if (file.content) {
    const sample = file.content.slice(0, 1024).toLowerCase()
    for (const ex of existing) {
      if (!ex.content) continue
      const other = ex.content.slice(0, 1024).toLowerCase()
      const similarity = calculateSimilarity(sample, other)
      if (similarity >= contentThreshold) {
        return { isDuplicate: true, duplicateOf: ex.name }
      }
    }
  }

  return { isDuplicate: false }
}
