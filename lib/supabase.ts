import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface ProcessedData {
  id: string
  name: string
  type: "research-paper" | "clinical-study" | "case-report" | "veterinary-journal" | "other"
  source: "upload" | "url"
  original_content: string
  processed_content: string
  extracted_data: {
    title: string
    summary: string
    keyPoints: string[]
    metadata: Record<string, string>
  }
  labels: string[]
  status: "ready" | "approved" | "rejected" | "processing"
  created_at: string
  updated_at: string
  quality_score?: number
  user_id?: string
}
