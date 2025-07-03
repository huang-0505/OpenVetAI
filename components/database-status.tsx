"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, RefreshCw, Wifi, WifiOff, AlertCircle } from "lucide-react"

interface DatabaseStats {
  totalRecords: number
  readyRecords: number
  approvedRecords: number
  rejectedRecords: number
  lastUpdated: string
}

export function DatabaseStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const testConnection = async () => {
    setIsLoading(true)
    setError("")

    try {
      // Test basic connection
      const { data, error: connectionError } = await supabase
        .from("processed_data")
        .select("count", { count: "exact", head: true })

      if (connectionError) {
        throw connectionError
      }

      setIsConnected(true)

      // Get detailed stats
      const { data: allData, error: statsError } = await supabase.from("processed_data").select("status, created_at")

      if (statsError) {
        throw statsError
      }

      const stats: DatabaseStats = {
        totalRecords: allData?.length || 0,
        readyRecords: allData?.filter((d) => d.status === "ready").length || 0,
        approvedRecords: allData?.filter((d) => d.status === "approved").length || 0,
        rejectedRecords: allData?.filter((d) => d.status === "rejected").length || 0,
        lastUpdated: new Date().toLocaleString(),
      }

      setStats(stats)
    } catch (err: any) {
      console.error("Database connection error:", err)
      setIsConnected(false)
      setError(err.message || "Failed to connect to database")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Connection
          <Button variant="ghost" size="sm" onClick={testConnection} disabled={isLoading} className="ml-auto">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
        <CardDescription>Supabase database connection status and statistics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected === null ? (
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
            ) : isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {isConnected === null ? "Testing..." : isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <Badge variant={isConnected ? "default" : "destructive"}>{isConnected ? "Online" : "Offline"}</Badge>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-medium">Connection Error:</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Database Stats */}
        {stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalRecords}</div>
                <div className="text-sm text-blue-600">Total Records</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.approvedRecords}</div>
                <div className="text-sm text-green-600">Approved</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.readyRecords}</div>
                <div className="text-sm text-yellow-600">Ready</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.rejectedRecords}</div>
                <div className="text-sm text-red-600">Rejected</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 text-center">Last updated: {stats.lastUpdated}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
