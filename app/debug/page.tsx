import { DataViewer } from "@/components/data-viewer"

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Debug</h1>
          <p className="text-gray-600">View and debug your Supabase database connection and stored data</p>
        </div>

        <DataViewer />
      </div>
    </div>
  )
}
