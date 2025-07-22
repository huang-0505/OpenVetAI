import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface ProcessedData {
  id: string
  name: string
  type: string
  source: string
  original_content: string
  processed_content: string
  extracted_data: any
  labels: string[]
  status: "pending" | "approved" | "rejected" | "ready"
  user_id?: string
  uploaded_by?: string
  created_at: string
  updated_at: string
}
