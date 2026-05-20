import { NextResponse } from "next/server"

// Addon API - Returns video sources for a given anime/episode
// This acts as a proxy to various streaming sources

const CONSUMET_ENDPOINTS = [
  "https://api.consumet.org",
  "https://consumet-api.vercel.app",
]

interface StreamSource {
  url: string
  quality: string
  isM3U8: boolean
}

interface StreamResponse {
  sources: StreamSource[]
  subtitles?: { url: string; lang: string }[]
  headers?: Record<string, string>
}

// Search anime in provider
async function searchInProvider(
  title: string,
  provider: string
): Promise<{ id: string; title: string } | null> {
  for (const endpoint of CONSUMET_ENDPOINTS) {
    try {
      const url = `${endpoint}/anime/${provider}/${encodeURIComponent(title)}`
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      const results = data.results || []
      
      if (results.length > 0) {
        // Try exact match first
        const exact = results.find(
          (r: { title: string }) => r.title.toLowerCase() === title.toLowerCase()
        )
        return exact || results[0]
      }
    } catch {
      continue
    }
  }
  return null
}

// Get anime info with episodes
async function getAnimeInfo(
  animeId: string,
  provider: string
): Promise<{ episodes: { id: string; number: number }[] } | null> {
  for (const endpoint of CONSUMET_ENDPOINTS) {
    try {
      const url = `${endpoint}/anime/${provider}/info/${animeId}`
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      return data
    } catch {
      continue
    }
  }
  return null
}

// Get streaming sources for an episode
async function getStreamSources(
  episodeId: string,
  provider: string
): Promise<StreamResponse | null> {
  for (const endpoint of CONSUMET_ENDPOINTS) {
    try {
      const url = `${endpoint}/anime/${provider}/watch/${episodeId}`
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      
      if (data.sources && data.sources.length > 0) {
        return {
          sources: data.sources.map((s: { url: string; quality: string; isM3U8?: boolean }) => ({
            url: s.url,
            quality: s.quality || "auto",
            isM3U8: s.isM3U8 !== false,
          })),
          subtitles: data.subtitles || [],
          headers: data.headers,
        }
      }
    } catch {
      continue
    }
  }
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const animeTitle = searchParams.get("title")
  const episodeNumber = parseInt(searchParams.get("episode") || "1")
  const provider = searchParams.get("provider") || "gogoanime"
  
  if (!animeTitle) {
    return NextResponse.json(
      { error: "Missing anime title parameter" },
      { status: 400 }
    )
  }
  
  try {
    // Step 1: Search for the anime
    const anime = await searchInProvider(animeTitle, provider)
    
    if (!anime) {
      return NextResponse.json({
        error: "Anime not found",
        title: animeTitle,
        provider,
        sources: [],
      })
    }
    
    // Step 2: Get anime info with episodes
    const animeInfo = await getAnimeInfo(anime.id, provider)
    
    if (!animeInfo || !animeInfo.episodes || animeInfo.episodes.length === 0) {
      return NextResponse.json({
        error: "No episodes found",
        title: animeTitle,
        animeId: anime.id,
        provider,
        sources: [],
      })
    }
    
    // Step 3: Find the requested episode
    const episode = animeInfo.episodes.find(ep => ep.number === episodeNumber) || animeInfo.episodes[0]
    
    if (!episode) {
      return NextResponse.json({
        error: "Episode not found",
        title: animeTitle,
        episodeNumber,
        provider,
        sources: [],
      })
    }
    
    // Step 4: Get streaming sources
    const streamData = await getStreamSources(episode.id, provider)
    
    if (!streamData || streamData.sources.length === 0) {
      return NextResponse.json({
        error: "No streaming sources found",
        title: animeTitle,
        episodeId: episode.id,
        provider,
        sources: [],
      })
    }
    
    return NextResponse.json({
      success: true,
      anime: {
        id: anime.id,
        title: anime.title,
      },
      episode: {
        id: episode.id,
        number: episode.number,
      },
      sources: streamData.sources,
      subtitles: streamData.subtitles,
      headers: streamData.headers,
      provider,
    })
  } catch (error) {
    console.error("[v0] Addon API error:", error)
    return NextResponse.json(
      { error: "Internal server error", sources: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // Support for custom addon URLs
  try {
    const body = await request.json()
    const { addonUrl, animeId, episodeNumber } = body
    
    if (!addonUrl || !animeId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }
    
    // Try to fetch from custom addon
    const url = `${addonUrl}/stream/${animeId}/${episodeNumber || 1}`
    
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    })
    
    if (!response.ok) {
      return NextResponse.json({
        error: "Custom addon request failed",
        sources: [],
      })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Custom addon error:", error)
    return NextResponse.json(
      { error: "Failed to fetch from custom addon", sources: [] },
      { status: 500 }
    )
  }
}
