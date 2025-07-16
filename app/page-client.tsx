"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

// Load the portal only in the browser
const Portal = dynamic(() => import("@/components/data-ingestion-portal-client"), { ssr: false })

export default function PageClient() {
  return (
    <Suspense fallback={null}>
      <Portal />
    </Suspense>
  )
}
