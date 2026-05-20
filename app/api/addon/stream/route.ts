import { NextResponse } from "next/server"

// Addon API - Returns video sources for a given anime/episode
// Using working Consumet mirror

const CONSUMET_ENDPOINT = "https://consumet-api.vercel.app"

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

// Helper to normalize anime title for search
function normalizeTitle(title: string): string {
  return title
    .replace(/[:\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/Season \d+/gi, "")
    .replace(/\d+(st|nd|rd|th) Season/gi, "")
    .trim()
}

// Search anime in provider with multiple attempts
async function searchInProvider(
  title: string,
  provider: string
): Promise<{ id: string; title: string } | null> {
  const searchTerms = [
    title,
    normalizeTitle(title),
    title.split(":")[0].trim(),
    title.split(" ").slice(0, 3).join(" "),
  ]
  
  for (const term of searchTerms) {
    try {
      const url = `${CONSUMET_ENDPOINT}/anime/${provider}/${encodeURIComponent(term)}`
      console.log("[v0] Searching:", url)
      
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      })
      
      if (!response.ok) {
        console.log("[v0] Search failed with status:", response.status)
        continue
      }
      
      const data = await response.json()
      const results = data.results || []
      
      console.log("[v0] Search results count:", results.length)
      
      if (results.length > 0) {
        // Try to find best match
        const lowerTitle = title.toLowerCase()
        const exact = results.find(
          (r: { title: string }) => r.title.toLowerCase() === lowerTitle
        )
        const partial = results.find(
          (r: { title: string }) => 
            r.title.toLowerCase().includes(lowerTitle.split(" ")[0].toLowerCase())
        )
        return exact || partial || results[0]
      }
    } catch (error) {
      console.log("[v0] Search error:", error)
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
  try {
    const url = `${CONSUMET_ENDPOINT}/anime/${provider}/info/${animeId}`
    console.log("[v0] Getting anime info:", url)
    
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    })
    
    if (!response.ok) {
      console.log("[v0] Anime info failed with status:", response.status)
      return null
    }
    
    const data = await response.json()
    console.log("[v0] Episodes count:", data.episodes?.length || 0)
    return data
  } catch (error) {
    console.log("[v0] Anime info error:", error)
    return null
  }
}

// Get streaming sources for an episode
async function getStreamSources(
  episodeId: string,
  provider: string
): Promise<StreamResponse | null> {
  try {
    const url = `${CONSUMET_ENDPOINT}/anime/${provider}/watch/${episodeId}`
    console.log("[v0] Getting stream sources:", url)
    
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    })
    
    if (!response.ok) {
      console.log("[v0] Stream failed with status:", response.status)
      return null
    }
    
    const data = await response.json()
    console.log("[v0] Sources count:", data.sources?.length || 0)
    
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
    return null
  } catch (error) {
    console.log("[v0] Stream sources error:", error)
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const animeTitle = searchParams.get("title")
  const episodeNumber = parseInt(searchParams.get("episode") || "1")
  const provider = searchParams.get("provider") || "gogoanime"
  
  console.log("[v0] Addon API request:", { animeTitle, episodeNumber, provider })
  
  if (!animeTitle) {
    return NextResponse.json(
      { error: "Missing anime title parameter" },
      { status: 400 }
    )
  }
  
  try {
    // Step 1: Search for the anime
    console.log("[v0] Step 1: Searching for anime...")
    const anime = await searchInProvider(animeTitle, provider)
    
    if (!anime) {
      console.log("[v0] Anime not found, trying alternative providers...")
      // Try with gogoanime as fallback
      if (provider !== "gogoanime") {
        const fallbackAnime = await searchInProvider(animeTitle, "gogoanime")
        if (fallbackAnime) {
          return await processAnime(fallbackAnime, episodeNumber, "gogoanime")
        }
      }
      return NextResponse.json({
        error: "Anime not found",
        title: animeTitle,
        provider,
        sources: [],
      })
    }
    
    return await processAnime(anime, episodeNumber, provider)
  } catch (error) {
    console.error("[v0] Addon API error:", error)
    return NextResponse.json(
      { error: "Internal server error", sources: [] },
      { status: 500 }
    )
  }
}

async function processAnime(
  anime: { id: string; title: string },
  episodeNumber: number,
  provider: string
) {
  // Step 2: Get anime info with episodes
  console.log("[v0] Step 2: Getting anime info for:", anime.id)
  const animeInfo = await getAnimeInfo(anime.id, provider)
  
  if (!animeInfo || !animeInfo.episodes || animeInfo.episodes.length === 0) {
    console.log("[v0] No episodes found")
    return NextResponse.json({
      error: "No episodes found",
      animeId: anime.id,
      provider,
      sources: [],
    })
  }
  
  // Step 3: Find the requested episode
  console.log("[v0] Step 3: Finding episode", episodeNumber)
  const episode = animeInfo.episodes.find(ep => ep.number === episodeNumber) || animeInfo.episodes[0]
  
  if (!episode) {
    console.log("[v0] Episode not found")
    return NextResponse.json({
      error: "Episode not found",
      episodeNumber,
      provider,
      sources: [],
    })
  }
  
  // Step 4: Get streaming sources
  console.log("[v0] Step 4: Getting stream sources for:", episode.id)
  const streamData = await getStreamSources(episode.id, provider)
  
  if (!streamData || streamData.sources.length === 0) {
    console.log("[v0] No streaming sources found")
    return NextResponse.json({
      error: "No streaming sources found",
      episodeId: episode.id,
      provider,
      sources: [],
    })
  }
  
  console.log("[v0] Success! Found", streamData.sources.length, "sources")
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
