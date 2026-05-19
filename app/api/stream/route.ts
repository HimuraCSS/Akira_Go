import { NextResponse } from "next/server"

// Multiple Consumet API endpoints for fallback
const CONSUMET_ENDPOINTS = [
  "https://api.consumet.org",
  "https://consumet-api.vercel.app",
  "https://consumet-jade.vercel.app",
]

// Stream sources database - maps anime titles to known stream sources
// This simulates what a real scraper would return
const STREAM_DATABASE: Record<string, { sources: StreamSource[], subtitles?: SubtitleTrack[] }> = {}

interface StreamSource {
  url: string
  quality: string
  isM3U8: boolean
  provider: string
}

interface SubtitleTrack {
  url: string
  lang: string
}

async function tryConsumetEndpoints(path: string): Promise<Response | null> {
  for (const baseUrl of CONSUMET_ENDPOINTS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { "Accept": "application/json" },
        // Next.js fetch cache
        next: { revalidate: 300 }, // Cache for 5 minutes
      })
      
      if (response.ok) {
        return response
      }
    } catch {
      continue
    }
  }
  return null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const action = url.searchParams.get("action")
  const provider = url.searchParams.get("provider") || "gogoanime"
  const query = url.searchParams.get("q")
  const animeId = url.searchParams.get("animeId")
  const episodeId = url.searchParams.get("episodeId")

  try {
    switch (action) {
      case "search": {
        if (!query) {
          return NextResponse.json({ error: "Missing query" }, { status: 400 })
        }
        
        const response = await tryConsumetEndpoints(
          `/anime/${provider}/${encodeURIComponent(query)}`
        )
        
        if (!response) {
          // Return empty results instead of error for better UX
          return NextResponse.json({ results: [] })
        }
        
        const data = await response.json()
        return NextResponse.json({ results: data.results || [] })
      }

      case "info": {
        if (!animeId) {
          return NextResponse.json({ error: "Missing animeId" }, { status: 400 })
        }
        
        const response = await tryConsumetEndpoints(
          `/anime/${provider}/info/${encodeURIComponent(animeId)}`
        )
        
        if (!response) {
          return NextResponse.json({ error: "Anime not found" }, { status: 404 })
        }
        
        const data = await response.json()
        return NextResponse.json(data)
      }

      case "watch": {
        if (!episodeId) {
          return NextResponse.json({ error: "Missing episodeId" }, { status: 400 })
        }
        
        // First try to get from Consumet
        const response = await tryConsumetEndpoints(
          `/anime/${provider}/watch/${encodeURIComponent(episodeId)}`
        )
        
        if (response) {
          const data = await response.json()
          if (data.sources && data.sources.length > 0) {
            return NextResponse.json({
              sources: data.sources.map((s: StreamSource) => ({
                ...s,
                provider: provider,
              })),
              subtitles: data.subtitles || [],
            })
          }
        }
        
        // Check our stream database as fallback
        const cachedStream = STREAM_DATABASE[episodeId]
        if (cachedStream) {
          return NextResponse.json(cachedStream)
        }
        
        // Return demo stream as last resort
        return NextResponse.json({
          sources: [
            {
              url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
              quality: "auto",
              isM3U8: true,
              provider: "demo",
            },
          ],
          subtitles: [],
          message: "Using demo stream - Real stream not found",
        })
      }

      case "servers": {
        if (!episodeId) {
          return NextResponse.json({ error: "Missing episodeId" }, { status: 400 })
        }
        
        const response = await tryConsumetEndpoints(
          `/anime/${provider}/servers/${encodeURIComponent(episodeId)}`
        )
        
        if (!response) {
          return NextResponse.json({ servers: [] })
        }
        
        const data = await response.json()
        return NextResponse.json({ servers: data || [] })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Stream API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST endpoint to add streams to database (for custom addons)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { episodeId, sources, subtitles } = body
    
    if (!episodeId || !sources) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    STREAM_DATABASE[episodeId] = { sources, subtitles }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Stream POST error:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
