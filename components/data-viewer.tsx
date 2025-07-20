"use client"

import { useState, useEffect } from "react"
import { supabase, type ProcessedData } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Eye, Database, RefreshCw, Download, BarChart3 } from "lucide-react"

export function DataViewer() {
  const [data, setData] = useState<ProcessedData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ProcessedData | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const { data: supabaseData, error } = await supabase
        .from("processed_data")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setData(supabaseData || [])
    } catch (err) {
      console.error("Error loading data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    const jsonData = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `veterinary-data-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Data Analytics */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Data Analytics
          </CardTitle>
          <CardDescription className="text-slate-300">Visualize and analyze your processed data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-slate-300">
            <p>Analytics dashboard coming soon...</p>
            <p className="text-sm text-slate-400 mt-2">View charts, graphs, and insights from your uploaded data.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Supabase Data ({data.length})
              </CardTitle>
              <CardDescription>All articles stored in your Supabase database</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="ml-auto border-slate-600 text-slate-300 bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button onClick={exportData} disabled={data.length === 0} className="w-full mb-4">
                <Download className="h-4 w-4 mr-2" />
                Export All Data (JSON)
              </Button>

              <ScrollArea className="h-96">
                {data.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No data found in database</p>
                ) : (
                  <div className="space-y-2">
                    {data.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedItem?.id === item.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-gray-500" />
                            <span className="font-medium truncate">{item.name}</span>
                          </div>
                          <Badge
                            variant={
                              item.status === "approved"
                                ? "default"
                                : item.status === "ready"
                                  ? "secondary"
                                  : item.status === "processing"
                                    ? "outline"
                                    : "destructive"
                            }
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {item.type.replace("-", " ")}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.source}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Data Details */}
        <Card>
          <CardHeader>
            <CardTitle>Data Details</CardTitle>
            <CardDescription>
              {selectedItem ? `Viewing: ${selectedItem.name}` : "Select an item to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedItem ? (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm">Database ID</h4>
                    <p className="text-xs text-gray-600 font-mono">{selectedItem.id}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm">Extracted Data</h4>
                    <div className="bg-gray-50 p-3 rounded text-xs">
                      <pre>{JSON.stringify(selectedItem.extracted_data, null, 2)}</pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm">Labels</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedItem.labels.length > 0 ? (
                        selectedItem.labels.map((label) => (
                          <Badge key={label} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">No labels assigned</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm">Content Preview</h4>
                    <div className="bg-gray-50 p-3 rounded text-xs max-h-32 overflow-y-auto">
                      {selectedItem.processed_content}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm">Timestamps</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Created: {new Date(selectedItem.created_at).toLocaleString()}</div>
                      <div>Updated: {new Date(selectedItem.updated_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12">
                <Database className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">No data to display</p>
                <p className="text-sm text-slate-500 mt-2">Upload and process files to see data here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
