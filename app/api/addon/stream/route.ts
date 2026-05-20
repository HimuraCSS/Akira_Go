import { NextResponse } from "next/server"

// anime-mapper API - maps AniList IDs to streaming platforms
const ANIME_MAPPER_BASE = "https://anime-mapper.vercel.app"

// Jikan API for anime metadata (MyAnimeList)
const JIKAN_BASE = "https://api.jikan.moe/v4"

// Megaplay embed URL format (fallback)
const MEGAPLAY_BASE = "https://megaplay.buzz"

interface StreamSource {
  url: string
  quality: string
  isM3U8: boolean
  type?: string
  size?: number
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

// Search anime in Jikan (MyAnimeList) to get AniList ID
async function searchJikan(title: string): Promise<{ mal_id: number; title: string; episodes: number | null } | null> {
  const searchTerms = [
    title,
    normalizeTitle(title),
    title.split(":")[0].trim(),
  ]
  
  for (const term of searchTerms) {
    try {
      const url = `${JIKAN_BASE}/anime?q=${encodeURIComponent(term)}&limit=5&sfw=true`
      console.log("[v0] Jikan search:", url)
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      })
      
      if (!response.ok) {
        if (response.status === 429) {
          await new Promise(r => setTimeout(r, 1000))
          continue
        }
        continue
      }
      
      const data = await response.json()
      const results = data.data || []
      
      if (results.length > 0) {
        // Find best match
        const lowerTitle = title.toLowerCase()
        const exact = results.find((r: { title: string }) => 
          r.title.toLowerCase() === lowerTitle
        )
        const partial = results.find((r: { title: string; title_english?: string }) => 
          r.title.toLowerCase().includes(term.toLowerCase()) ||
          r.title_english?.toLowerCase().includes(term.toLowerCase())
        )
        const result = exact || partial || results[0]
        console.log("[v0] Jikan found:", result.mal_id, result.title)
        return {
          mal_id: result.mal_id,
          title: result.title,
          episodes: result.episodes,
        }
      }
    } catch (error) {
      console.log("[v0] Jikan error:", error)
      continue
    }
  }
  return null
}

// Get AniList ID from MAL ID
async function getAnilistId(malId: number): Promise<number | null> {
  try {
    const query = `
      query ($malId: Int) {
        Media(idMal: $malId, type: ANIME) {
          id
        }
      }
    `
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { malId } }),
      signal: AbortSignal.timeout(5000),
    })
    
    if (!response.ok) return null
    
    const data = await response.json()
    return data?.data?.Media?.id || null
  } catch {
    return null
  }
}

// Try anime-mapper API for HLS streams (AnimeKai provider)
async function tryAnimeMapper(anilistId: number, episodeNumber: number): Promise<StreamResponse | null> {
  try {
    // First, get AnimeKai mapping
    const mapUrl = `${ANIME_MAPPER_BASE}/animekai/map/${anilistId}`
    console.log("[v0] AnimeMapper mapping:", mapUrl)
    
    const mapResponse = await fetch(mapUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    })
    
    if (!mapResponse.ok) {
      console.log("[v0] AnimeMapper map failed:", mapResponse.status)
      return null
    }
    
    const mapData = await mapResponse.json()
    const animekai = mapData.animekai
    
    if (!animekai || !animekai.episodes || animekai.episodes.length === 0) {
      console.log("[v0] AnimeMapper: no episodes found")
      return null
    }
    
    console.log("[v0] AnimeMapper found:", animekai.title, "episodes:", animekai.episodes.length)
    
    // Find the episode
    const episode = animekai.episodes.find((ep: { number: number }) => ep.number === episodeNumber) 
                   || animekai.episodes[episodeNumber - 1]
                   || animekai.episodes[0]
    
    if (!episode || !episode.id) {
      console.log("[v0] AnimeMapper: episode not found")
      return null
    }
    
    // Get streaming sources
    const sourcesUrl = `${ANIME_MAPPER_BASE}/animekai/sources/${episode.id}`
    console.log("[v0] AnimeMapper sources:", sourcesUrl)
    
    const sourcesResponse = await fetch(sourcesUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
    })
    
    if (!sourcesResponse.ok) {
      console.log("[v0] AnimeMapper sources failed:", sourcesResponse.status)
      return null
    }
    
    const sourcesData = await sourcesResponse.json()
    
    if (!sourcesData.sources || sourcesData.sources.length === 0) {
      console.log("[v0] AnimeMapper: no sources")
      return null
    }
    
    console.log("[v0] AnimeMapper success! Sources:", sourcesData.sources.length)
    
    return {
      success: true,
      sources: sourcesData.sources.map((s: { url: string; quality: string; isM3U8?: boolean; size?: number }) => ({
        url: s.url,
        quality: s.quality || "auto",
        isM3U8: s.isM3U8 !== false,
        type: "hls",
        size: s.size,
      })),
      subtitles: sourcesData.subtitles || [],
      intro: sourcesData.intro,
      outro: sourcesData.outro,
      headers: sourcesData.headers || { Referer: "https://kwik.cx/" },
      isIframe: false,
      isDemo: false,
      provider: "animekai",
    }
  } catch (error) {
    console.log("[v0] AnimeMapper error:", error)
    return null
  }
}

// Try AnimePahe as alternative
async function tryAnimePahe(anilistId: number, episodeNumber: number): Promise<StreamResponse | null> {
  try {
    const mapUrl = `${ANIME_MAPPER_BASE}/animepahe/map/${anilistId}`
    console.log("[v0] AnimePahe mapping:", mapUrl)
    
    const mapResponse = await fetch(mapUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    })
    
    if (!mapResponse.ok) return null
    
    const mapData = await mapResponse.json()
    const animepahe = mapData.animepahe
    
    if (!animepahe || !animepahe.episodes?.data || animepahe.episodes.data.length === 0) {
      return null
    }
    
    console.log("[v0] AnimePahe found:", animepahe.title)
    
    // Find episode
    const episodes = animepahe.episodes.data
    const episode = episodes.find((ep: { episode: number }) => ep.episode === episodeNumber) 
                   || episodes[episodeNumber - 1]
                   || episodes[0]
    
    if (!episode || !episode.id) return null
    
    // Get sources
    const sourcesUrl = `${ANIME_MAPPER_BASE}/animepahe/sources/${animepahe.id}/${episode.id}`
    console.log("[v0] AnimePahe sources:", sourcesUrl)
    
    const sourcesResponse = await fetch(sourcesUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
    })
    
    if (!sourcesResponse.ok) return null
    
    const sourcesData = await sourcesResponse.json()
    
    if (!sourcesData.sources || sourcesData.sources.length === 0) return null
    
    console.log("[v0] AnimePahe success! Sources:", sourcesData.sources.length)
    
    return {
      success: true,
      sources: sourcesData.sources.map((s: { url: string; quality: string; isM3U8?: boolean; size?: number }) => ({
        url: s.url,
        quality: s.quality || "auto",
        isM3U8: s.isM3U8 !== false,
        type: "hls",
        size: s.size,
      })),
      headers: sourcesData.headers || { Referer: "https://kwik.cx/" },
      isIframe: false,
      isDemo: false,
      provider: "animepahe",
    }
  } catch (error) {
    console.log("[v0] AnimePahe error:", error)
    return null
  }
}

// Megaplay iframe as final fallback
function getMegaplayStream(malId: number, episodeNumber: number): StreamResponse {
  const subUrl = `${MEGAPLAY_BASE}/stream/mal/${malId}/${episodeNumber}/sub`
  const dubUrl = `${MEGAPLAY_BASE}/stream/mal/${malId}/${episodeNumber}/dub`
  
  return {
    success: true,
    sources: [
      { url: subUrl, quality: "Legendado", isM3U8: false, type: "iframe" },
      { url: dubUrl, quality: "Dublado", isM3U8: false, type: "iframe" },
    ],
    isIframe: true,
    isDemo: false,
    provider: "megaplay",
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const animeTitle = searchParams.get("title")
  const episodeNumber = parseInt(searchParams.get("episode") || "1")
  
  console.log("[v0] Stream request:", { animeTitle, episodeNumber })
  
  if (!animeTitle) {
    return NextResponse.json({ error: "Missing title", sources: [] }, { status: 400 })
  }
  
  try {
    // Step 1: Search Jikan for MAL ID
    console.log("[v0] Step 1: Searching Jikan...")
    const jikanResult = await searchJikan(animeTitle)
    
    if (!jikanResult) {
      console.log("[v0] Anime not found in Jikan, using demo")
      return NextResponse.json({
        success: true,
        sources: DEMO_STREAMS,
        isDemo: true,
        error: "Anime not found",
      })
    }
    
    // Step 2: Get AniList ID from MAL ID
    console.log("[v0] Step 2: Getting AniList ID for MAL:", jikanResult.mal_id)
    const anilistId = await getAnilistId(jikanResult.mal_id)
    
    if (!anilistId) {
      console.log("[v0] AniList ID not found, using Megaplay fallback")
      return NextResponse.json(getMegaplayStream(jikanResult.mal_id, episodeNumber))
    }
    
    console.log("[v0] AniList ID:", anilistId)
    
    // Step 3: Try anime-mapper providers
    console.log("[v0] Step 3: Trying AnimeKai...")
    let result = await tryAnimeMapper(anilistId, episodeNumber)
    
    if (!result) {
      console.log("[v0] Step 4: Trying AnimePahe...")
      result = await tryAnimePahe(anilistId, episodeNumber)
    }
    
    if (result) {
      return NextResponse.json({
        ...result,
        anime: {
          title: jikanResult.title,
          malId: jikanResult.mal_id,
          anilistId,
        },
        episode: episodeNumber,
      })
    }
    
    // Step 5: Megaplay iframe fallback
    console.log("[v0] Step 5: Using Megaplay iframe fallback")
    return NextResponse.json({
      ...getMegaplayStream(jikanResult.mal_id, episodeNumber),
      anime: {
        title: jikanResult.title,
        malId: jikanResult.mal_id,
        anilistId,
      },
      episode: episodeNumber,
    })
    
  } catch (error) {
    console.error("[v0] Stream API error:", error)
    return NextResponse.json({
      success: true,
      sources: DEMO_STREAMS,
      isDemo: true,
      error: "Stream fetch failed",
    })
  }
}
