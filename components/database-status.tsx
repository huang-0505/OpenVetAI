"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database } from "lucide-react"

export function DatabaseStatus() {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white flex items-center">
            <Database className="h-5 w-5 mr-2 text-blue-500" />
            Database Connection
          </CardTitle>
          <CardDescription className="text-slate-400">
            Supabase database connection status and statistics
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
            Connected
          </Badge>
          <Badge variant="outline" className="border-green-500 text-green-400">
            Online
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 p-4 rounded-lg border border-blue-500/20 text-center">
            <div className="text-2xl font-bold text-blue-400">1</div>
            <div className="text-sm text-slate-400">Total Records</div>
          </div>
          <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 p-4 rounded-lg border border-green-500/20 text-center">
            <div className="text-2xl font-bold text-green-400">1</div>
            <div className="text-sm text-slate-400">Approved</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 text-center">
            <div className="text-2xl font-bold text-yellow-400">0</div>
            <div className="text-sm text-slate-400">Ready</div>
          </div>
          <div className="bg-gradient-to-br from-red-600/20 to-red-500/10 p-4 rounded-lg border border-red-500/20 text-center">
            <div className="text-2xl font-bold text-red-400">0</div>
            <div className="text-sm text-slate-400">Rejected</div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  )
}
