import { NextResponse } from "next/server"

// Wyzie Subs API - agregates subtitles from multiple sources
const WYZIE_SUBS_URL = "https://sub.wyzie.io"

interface SubtitleResult {
  id: string
  url: string
  lang: string
  langCode: string
  format: string
  source: string
  release?: string
  downloads?: number
}

// Search subtitles by anime title and episode
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get("title")
  const episode = searchParams.get("episode") || "1"
  const season = searchParams.get("season") || "1"
  const malId = searchParams.get("malId")
  const language = searchParams.get("lang") || "pt-BR"
  
  if (!title && !malId) {
    return NextResponse.json({ error: "Title or MAL ID required" }, { status: 400 })
  }

  try {
    const subtitles: SubtitleResult[] = []
    
    // First try to get TMDB ID from MAL ID or title
    let tmdbId: string | null = null
    
    if (malId) {
      // Try to convert MAL ID to TMDB ID using external mapping
      const mappingResponse = await fetch(
        `https://api.jikan.moe/v4/anime/${malId}/external`,
        { signal: AbortSignal.timeout(5000) }
      ).catch(() => null)
      
      if (mappingResponse?.ok) {
        const mappingData = await mappingResponse.json()
        const tmdbEntry = mappingData.data?.find((e: { name: string; url: string }) => 
          e.name === "TMDB" || e.url?.includes("themoviedb.org")
        )
        if (tmdbEntry?.url) {
          const match = tmdbEntry.url.match(/\/tv\/(\d+)/)
          tmdbId = match?.[1] || null
        }
      }
    }
    
    // Search in Wyzie Subs if we have TMDB ID
    if (tmdbId) {
      console.log("[v0] Searching Wyzie Subs with TMDB ID:", tmdbId)
      
      const wyzieResponse = await fetch(
        `${WYZIE_SUBS_URL}/search?tmdb_id=${tmdbId}&type=tv&season=${season}&episode=${episode}&format=srt,vtt,ass&source=opensubtitles,subdl,subf2m`,
        { signal: AbortSignal.timeout(10000) }
      ).catch(() => null)
      
      if (wyzieResponse?.ok) {
        const wyzieData = await wyzieResponse.json()
        console.log("[v0] Wyzie Subs results:", wyzieData.length || 0)
        
        if (Array.isArray(wyzieData)) {
          for (const sub of wyzieData) {
            // Filter by Portuguese
            const isPtBr = sub.lang?.toLowerCase().includes("portuguese") || 
                          sub.langCode === "pt-BR" || 
                          sub.langCode === "pob" ||
                          sub.langCode === "por"
            
            if (isPtBr) {
              subtitles.push({
                id: sub.id || `wyzie-${subtitles.length}`,
                url: sub.url,
                lang: "Portugues (BR)",
                langCode: "pt-BR",
                format: sub.format || "srt",
                source: sub.source || "opensubtitles",
                release: sub.release,
                downloads: sub.downloads,
              })
            }
          }
        }
      }
    }
    
    // Also search by title in OpenSubtitles directly via Wyzie
    if (title && subtitles.length === 0) {
      console.log("[v0] Searching by title:", title)
      
      const titleSearchResponse = await fetch(
        `${WYZIE_SUBS_URL}/search?query=${encodeURIComponent(title)}&season=${season}&episode=${episode}&format=srt,vtt,ass&source=opensubtitles,subdl`,
        { signal: AbortSignal.timeout(10000) }
      ).catch(() => null)
      
      if (titleSearchResponse?.ok) {
        const titleData = await titleSearchResponse.json()
        console.log("[v0] Title search results:", titleData.length || 0)
        
        if (Array.isArray(titleData)) {
          for (const sub of titleData) {
            const isPtBr = sub.lang?.toLowerCase().includes("portuguese") || 
                          sub.langCode === "pt-BR" || 
                          sub.langCode === "pob" ||
                          sub.langCode === "por"
            
            if (isPtBr) {
              subtitles.push({
                id: sub.id || `wyzie-title-${subtitles.length}`,
                url: sub.url,
                lang: "Portugues (BR)",
                langCode: "pt-BR",
                format: sub.format || "srt",
                source: sub.source || "opensubtitles",
                release: sub.release,
                downloads: sub.downloads,
              })
            }
          }
        }
      }
    }
    
    // Also add English subtitles as fallback
    if (subtitles.length === 0 && language !== "en") {
      console.log("[v0] No PT-BR found, including English as fallback")
      // Return empty - the player already has English from Megaplay
    }
    
    // Sort by downloads (most popular first)
    subtitles.sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
    
    console.log("[v0] Returning", subtitles.length, "PT-BR subtitles")
    
    return NextResponse.json({
      success: true,
      count: subtitles.length,
      subtitles: subtitles.slice(0, 10), // Max 10 results
      language: "pt-BR",
    })
  } catch (error) {
    console.error("[v0] Subtitle search error:", error)
    return NextResponse.json({ 
      success: false,
      error: "Subtitle search failed",
      subtitles: [],
    })
  }
}
