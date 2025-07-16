"use client"

import { useState, useEffect } from "react"

/**
 * Returns `true` once the component has mounted on the client.
 * Useful for 3rd-party components that must only render after hydration.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}
