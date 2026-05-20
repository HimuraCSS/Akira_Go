import { NextResponse } from "next/server"

// Use amvstrm API
const AMVSTRM_URL = "https://api.amvstr.me/api/v2"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params

  // Skip demo episode IDs - redirect to addon API
  if (episodeId.startsWith("demo-")) {
    return NextResponse.json({ 
      error: "Demo episode - use /api/addon/stream with anime title instead",
      sources: [] 
    })
  }

  try {
    const url = `${AMVSTRM_URL}/stream/${episodeId}`
    console.log("[API] Watch request:", url)
    
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.log("[API] Watch failed with status:", response.status)
      return NextResponse.json({ 
        error: `API error: ${response.status}`,
        sources: [] 
      }, { status: response.status })
    }

    const text = await response.text()
    if (!text.startsWith("{")) {
      return NextResponse.json({ error: "Invalid response", sources: [] }, { status: 500 })
    }

    const data = JSON.parse(text)
    console.log("[API] Watch success, sources:", data.sources?.length || 0)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] Watch error:", error)
    return NextResponse.json({ error: "Stream fetch failed", sources: [] }, { status: 500 })
  }
}
