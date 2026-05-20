import { NextResponse } from "next/server"

// Jikan API for anime metadata (MyAnimeList)
const JIKAN_BASE = "https://api.jikan.moe/v4"

// Megaplay embed URL format (from EliasDex)
// Format: https://megaplay.buzz/stream/mal/{malId}/{episodeNumber}/{sub|dub}
const MEGAPLAY_BASE = "https://megaplay.buzz"

interface StreamSource {
  url: string
  quality: string
  isM3U8: boolean
  type?: string
}

// Demo streams as fallback
const DEMO_STREAMS: StreamSource[] = [
  {
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    quality: "720p",
    isM3U8: true,
  },
]

// Normalize title for search
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[:\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/season \d+/gi, "")
    .replace(/\d+(st|nd|rd|th) season/gi, "")
    .trim()
}

// Search anime in Jikan (MyAnimeList)
async function searchJikan(title: string): Promise<{ mal_id: number; title: string; episodes: number | null } | null> {
  const searchTerms = [
    title,
    normalizeTitle(title),
    title.split(":")[0].trim(),
    title.split(" ").slice(0, 2).join(" "),
  ]
  
  for (const term of searchTerms) {
    try {
      const url = `${JIKAN_BASE}/anime?q=${encodeURIComponent(term)}&limit=10&sfw=true`
      console.log("[v0] Jikan search:", url)
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      })
      
      if (!response.ok) {
        console.log("[v0] Jikan response status:", response.status)
        // Jikan has rate limiting - wait and retry
        if (response.status === 429) {
          await new Promise(r => setTimeout(r, 1000))
          continue
        }
        continue
      }
      
      const data = await response.json()
      const results = data.data || []
      
      console.log("[v0] Jikan found", results.length, "results")
      
      if (results.length > 0) {
        // Try exact match first
        const lowerTitle = title.toLowerCase()
        const exact = results.find((r: { title: string }) => 
          r.title.toLowerCase() === lowerTitle ||
          r.title_english?.toLowerCase() === lowerTitle
        )
        
        if (exact) {
          console.log("[v0] Found exact match:", exact.title, "MAL ID:", exact.mal_id)
          return { mal_id: exact.mal_id, title: exact.title, episodes: exact.episodes }
        }
        
        // Return first result if no exact match
        const first = results[0]
        console.log("[v0] Using first result:", first.title, "MAL ID:", first.mal_id)
        return { mal_id: first.mal_id, title: first.title, episodes: first.episodes }
      }
    } catch (error) {
      console.log("[v0] Jikan search error:", error)
      continue
    }
  }
  
  return null
}

// Build Megaplay embed URL
function buildMegaplayUrl(malId: number, episode: number, category: string = "sub"): string {
  return `${MEGAPLAY_BASE}/stream/mal/${malId}/${episode}/${category}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const animeTitle = searchParams.get("title")
  const episodeNumber = parseInt(searchParams.get("episode") || "1")
  const category = searchParams.get("category") || "sub" // sub or dub
  
  console.log("[v0] Stream request:", { animeTitle, episodeNumber, category })
  
  if (!animeTitle) {
    return NextResponse.json(
      { error: "Missing anime title parameter" },
      { status: 400 }
    )
  }
  
  try {
    // Step 1: Search anime in Jikan to get MAL ID
    console.log("[v0] Step 1: Searching Jikan for MAL ID...")
    const anime = await searchJikan(animeTitle)
    
    if (!anime) {
      console.log("[v0] Anime not found in Jikan, returning demo")
      return NextResponse.json({
        success: true,
        isDemo: true,
        anime: { title: animeTitle },
        episode: { number: episodeNumber },
        sources: DEMO_STREAMS,
        message: "Anime not found - showing demo",
      })
    }
    
    // Step 2: Build Megaplay embed URLs for sub and dub
    const subUrl = buildMegaplayUrl(anime.mal_id, episodeNumber, "sub")
    const dubUrl = buildMegaplayUrl(anime.mal_id, episodeNumber, "dub")
    
    console.log("[v0] Megaplay URLs built:", { subUrl, dubUrl })
    
    // Return iframe sources
    return NextResponse.json({
      success: true,
      isDemo: false,
      isIframe: true,
      anime: {
        mal_id: anime.mal_id,
        title: anime.title,
        episodes: anime.episodes,
      },
      episode: {
        number: episodeNumber,
      },
      sources: [
        {
          url: category === "dub" ? dubUrl : subUrl,
          quality: category === "dub" ? "DUB" : "SUB",
          isM3U8: false,
          type: "iframe",
          name: category === "dub" ? "Dublado" : "Legendado",
        },
      ],
      // Also provide alternative sources
      alternativeSources: [
        {
          url: subUrl,
          quality: "SUB",
          type: "iframe",
          name: "Legendado",
        },
        {
          url: dubUrl,
          quality: "DUB", 
          type: "iframe",
          name: "Dublado",
        },
      ],
      embedUrl: category === "dub" ? dubUrl : subUrl,
      provider: "megaplay",
    })
  } catch (error) {
    console.error("[v0] Stream API error:", error)
    
    // Return demo on error
    return NextResponse.json({
      success: true,
      isDemo: true,
      anime: { title: animeTitle },
      episode: { number: episodeNumber },
      sources: DEMO_STREAMS,
      error: "Failed to fetch stream",
    })
  }
}
