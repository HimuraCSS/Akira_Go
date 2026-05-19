"use client"

import { MALAuthProvider } from "@/components/anitracker/mal-auth-context"
import { StreamingProvider } from "@/components/anitracker/streaming-context"

export default function DescobrirLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MALAuthProvider>
      <StreamingProvider>
        {children}
      </StreamingProvider>
    </MALAuthProvider>
  )
}
