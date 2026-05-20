import { NextResponse } from "next/server"

// Consumet mirrors list - these are community-hosted and more reliable
const CONSUMET_MIRRORS = [
  "https://consumet-api-five-chi.vercel.app",
  "https://consumet-api-cyan.vercel.app",
  "https://consumet-api-pi.vercel.app",
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const provider = searchParams.get("provider") || "gogoanime"

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 })
  }

  // Try each mirror
  for (const mirror of CONSUMET_MIRRORS) {
    try {
      const url = `${mirror}/anime/${provider}/${encodeURIComponent(query)}`
      console.log("[API] Search request:", url)
      
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      })

      if (!response.ok) continue
      
      const text = await response.text()
      
      // Validate JSON response
      if (!text.startsWith("{") && !text.startsWith("[")) {
        console.log("[API] Invalid response from:", mirror)
        continue
      }
      
      const data = JSON.parse(text)
      const results = data.results || []
      
      if (results.length > 0) {
        console.log("[API] Search success from:", mirror, "results:", results.length)
        return NextResponse.json({ results })
      }
    } catch (error) {
      console.log("[API] Mirror failed:", mirror, error instanceof Error ? error.message : "Unknown")
      continue
    }
  }

  // Return empty if all mirrors failed
  console.log("[API] All mirrors failed for search:", query)
  return NextResponse.json({ results: [] })
}
