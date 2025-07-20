"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Database, RefreshCw } from "lucide-react"

export function DatabaseStatus() {
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setLastUpdated(new Date())
    setIsRefreshing(false)
  }

  const stats = [
    { label: "Total Records", value: "1", color: "blue" },
    { label: "Approved", value: "1", color: "green" },
    { label: "Ready", value: "0", color: "yellow" },
    { label: "Rejected", value: "0", color: "red" },
  ]

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Database Connection
            </CardTitle>
            <CardDescription className="text-slate-300">
              Supabase database connection status and statistics
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              className={`${isConnected ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"} border`}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const colorClasses = {
              blue: "bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400",
              green: "bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 text-green-400",
              yellow: "bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400",
              red: "bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30 text-red-400",
            }

            return (
              <div
                key={index}
                className={`${colorClasses[stat.color as keyof typeof colorClasses]} border rounded-lg p-4 text-center`}
              >
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-slate-300">{stat.label}</div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 text-sm text-slate-400">Last updated: {lastUpdated.toLocaleString()}</div>
      </CardContent>
    </Card>
  )
}
