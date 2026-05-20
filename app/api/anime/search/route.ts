import { NextResponse } from "next/server"

// Use amvstrm API as primary (more reliable)
const AMVSTRM_URL = "https://api.amvstr.me/api/v2"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 })
  }

  try {
    // Try amvstrm API first (most reliable)
    const amvstrmUrl = `${AMVSTRM_URL}/search?q=${encodeURIComponent(query)}&limit=20`
    console.log("[API] Search request:", amvstrmUrl)
    
    const response = await fetch(amvstrmUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const text = await response.text()
      // Validate JSON
      if (!text.startsWith("{") && !text.startsWith("[")) {
        throw new Error("Invalid response")
      }
      
      const data = JSON.parse(text)
      const results = data.results || data.data || []
      
      if (results.length > 0) {
        console.log("[API] Search success, results:", results.length)
        return NextResponse.json({ 
          results: results.map((r: { id: string; title: string; image?: string; cover?: string; releaseDate?: string; type?: string }) => ({
            id: r.id,
            title: r.title,
            image: r.image || r.cover,
            releaseDate: r.releaseDate,
            type: r.type,
          }))
        })
      }
    }

    // Return empty results if nothing found
    console.log("[API] No results found for:", query)
    return NextResponse.json({ results: [] })
  } catch (error) {
    console.error("[API] Search error:", error)
    return NextResponse.json({ results: [], error: "Search failed" })
  }
}
