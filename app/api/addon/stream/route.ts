import { NextResponse } from "next/server"

// Jikan API for anime metadata (MyAnimeList)
const JIKAN_BASE = "https://api.jikan.moe/v4"

// Megaplay embed URL format (based on EliasDex pattern)
const MEGAPLAY_BASE = "https://megaplay.buzz"

interface StreamSource {
  url: string
  quality: string
  isM3U8: boolean
  type?: string
}

interface StreamResponse {
  success: boolean
  sources: StreamSource[]
  subtitles?: { url: string; lang: string }[]
  intro?: { start: number; end: number }
  outro?: { start: number; end: number }
  headers?: Record<string, string>
  isIframe?: boolean
  isDemo?: boolean
  provider?: string
  error?: string
}

// Search Jikan for MAL ID
async function searchJikan(title: string): Promise<{ mal_id: number; title: string } | null> {
  // Try multiple search terms
  const searchTerms = [
    title,
    title.replace(/[:\-–—]/g, " ").replace(/\s+/g, " ").trim(),
    title.split(":")[0].trim(),
    title.split(" ").slice(0, 3).join(" "),
  ]
  
  for (const term of searchTerms) {
    try {
      const url = `${JIKAN_BASE}/anime?q=${encodeURIComponent(term)}&limit=5&sfw=true`
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      const results = data.data || []
      
      if (results.length > 0) {
        return { mal_id: results[0].mal_id, title: results[0].title }
      }
    } catch {
      continue
    }
  }
  
  return null
}

export async function GET(request: Request): Promise<NextResponse<StreamResponse>> {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get("title")
  const episodeStr = searchParams.get("episode") || "1"
  const episode = parseInt(episodeStr)

  if (!title) {
    return NextResponse.json({
      success: false,
      sources: [],
      error: "Título não fornecido",
      provider: "None",
    })
  }

  // Search for MAL ID using Jikan
  const jikanResult = await searchJikan(title)
  
  if (!jikanResult) {
    return NextResponse.json({
      success: false,
      sources: [],
      error: `Anime "${title}" não encontrado no MyAnimeList`,
      provider: "None",
    })
  }

  const malId = jikanResult.mal_id

  // Return Megaplay iframe sources (same pattern as EliasDex)
  // URL format: https://megaplay.buzz/stream/mal/{mal_id}/{episode}/{category}
  const sources: StreamSource[] = [
    {
      url: `${MEGAPLAY_BASE}/stream/mal/${malId}/${episode}/sub`,
      quality: "SUB",
      isM3U8: false,
      type: "iframe",
    },
    {
      url: `${MEGAPLAY_BASE}/stream/mal/${malId}/${episode}/dub`,
      quality: "DUB",
      isM3U8: false,
      type: "iframe",
    },
  ]

  return NextResponse.json({
    success: true,
    sources,
    isIframe: true,
    provider: "Megaplay",
  })
}
