import { NextResponse } from "next/server"

// Consumet mirrors
const CONSUMET_MIRRORS = [
  "https://consumet-api-five-chi.vercel.app",
  "https://consumet-api-cyan.vercel.app",
  "https://consumet-api-pi.vercel.app",
]

export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider") || "gogoanime"

  // Skip demo episode IDs
  if (episodeId.startsWith("demo-")) {
    return NextResponse.json({ 
      error: "Demo episode - use /api/addon/stream with anime title",
      sources: [] 
    })
  }

  for (const mirror of CONSUMET_MIRRORS) {
    try {
      const url = `${mirror}/anime/${provider}/watch/${episodeId}`
      console.log("[API] Watch request:", url)
      
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      })

      if (!response.ok) continue

      const text = await response.text()
      if (!text.startsWith("{")) continue

      const data = JSON.parse(text)
      
      if (data.sources && data.sources.length > 0) {
        console.log("[API] Watch success from:", mirror, "sources:", data.sources.length)
        return NextResponse.json(data)
      }
    } catch (error) {
      console.log("[API] Watch mirror failed:", mirror, error instanceof Error ? error.message : "Unknown")
      continue
    }
  }

  return NextResponse.json({ error: "Stream fetch failed", sources: [] }, { status: 500 })
}
