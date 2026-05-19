"use client"

import { MALAuthProvider } from "@/components/anitracker/mal-auth-context"

export default function MinhaListaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MALAuthProvider>
      {children}
    </MALAuthProvider>
  )
}
