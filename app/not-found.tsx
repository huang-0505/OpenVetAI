import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <FileQuestion className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <CardTitle className="text-2xl text-white">Page Not Found</CardTitle>
          <CardDescription className="text-slate-400">The page you're looking for doesn't exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Return Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
