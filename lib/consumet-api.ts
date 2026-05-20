"use client"

// Consumet API Service - Uses internal API routes to avoid CORS
// Falls back to demo streams if API fails

// Types for Consumet API responses
export interface ConsumetAnimeResult {
  id: string
  title: string
  image: string
  releaseDate?: string
  subOrDub?: "sub" | "dub"
  episodeCount?: number
}

export interface ConsumetAnimeInfo {
  id: string
  title: string
  url?: string
  image: string
  releaseDate?: string
  description?: string
  genres?: string[]
  subOrDub?: "sub" | "dub"
  type?: string
  status?: string
  otherName?: string
  totalEpisodes?: number
  episodes: ConsumetEpisode[]
}

export interface ConsumetEpisode {
  id: string
  number: number
  url?: string
}

export interface ConsumetStreamSource {
  url: string
  quality: string
  isM3U8: boolean
  type?: string // "hls" | "mp4" | "iframe"
}

export interface ConsumetStreamInfo {
  headers?: {
    Referer?: string
  }
  sources: ConsumetStreamSource[]
  subtitles?: { url: string; lang: string }[]
  download?: string
  isIframe?: boolean
  isDemo?: boolean
  intro?: { start: number; end: number }
  outro?: { start: number; end: number }
  provider?: string
}

// Available providers
export type ConsumetProvider = "gogoanime" | "zoro" | "animefox" | "animepahe"

// Demo/fallback streams for when API fails (public domain test streams)
const DEMO_STREAMS: ConsumetStreamSource[] = [
  {
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    quality: "auto",
    isM3U8: true,
  },
  {
    url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
    quality: "720p",
    isM3U8: true,
  },
  {
    url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8",
    quality: "480p",
    isM3U8: true,
  },
]

// Search anime by query - uses internal API route
export async function searchAnime(
  query: string, 
  provider: ConsumetProvider = "gogoanime"
): Promise<ConsumetAnimeResult[]> {
  try {
    const response = await fetch(
      `/api/anime/search?q=${encodeURIComponent(query)}&provider=${provider}`
    )
    
    if (!response.ok) {
      console.log("[v0] Search API returned error, using fallback")
      return createDemoSearchResults(query)
    }
    
    const data = await response.json()
    
    if (data.error || !data.results || data.results.length === 0) {
      return createDemoSearchResults(query)
    }
    
    return data.results
  } catch (error) {
    return createDemoSearchResults(query)
  }
}

// Create demo search results when API fails
function createDemoSearchResults(query: string): ConsumetAnimeResult[] {
  const slug = query.toLowerCase().replace(/\s+/g, "-")
  return [
    {
      id: `demo-${slug}`,
      title: query,
      image: `https://via.placeholder.com/225x318/1a1a2e/ff2e2e?text=${encodeURIComponent(query.substring(0, 10))}`,
      subOrDub: "sub",
      episodeCount: 12,
    }
  ]
}

// Get anime info with episode list
export async function getAnimeInfo(
  animeId: string,
  provider: ConsumetProvider = "gogoanime"
): Promise<ConsumetAnimeInfo | null> {
  try {
    // Handle demo anime IDs
    if (animeId.startsWith("demo-")) {
      return createDemoAnimeInfo(animeId)
    }
    
    const response = await fetch(
      `/api/anime/info/${encodeURIComponent(animeId)}?provider=${provider}`
    )
    
    if (!response.ok) {
      console.log("[v0] Info API returned error, using fallback")
      return createDemoAnimeInfo(animeId)
    }
    
    const data = await response.json()
    
    if (data.error || !data.episodes) {
      console.log("[v0] No episodes from API, using fallback")
      return createDemoAnimeInfo(animeId)
    }
    
    return data
  } catch (error) {
    console.log("[v0] Info failed, using fallback:", error)
    return createDemoAnimeInfo(animeId)
  }
}

// Create demo anime info when API fails
function createDemoAnimeInfo(animeId: string): ConsumetAnimeInfo {
  const title = animeId.replace("demo-", "").replace(/-/g, " ")
  const episodes: ConsumetEpisode[] = Array.from({ length: 12 }, (_, i) => ({
    id: `${animeId}-episode-${i + 1}`,
    number: i + 1,
  }))
  
  return {
    id: animeId,
    title: title.charAt(0).toUpperCase() + title.slice(1),
    image: `https://via.placeholder.com/225x318/1a1a2e/ff2e2e?text=Demo`,
    totalEpisodes: 12,
    episodes,
    status: "Completed",
    subOrDub: "sub",
  }
}

// Get streaming sources for an episode
export async function getStreamingSources(
  episodeId: string,
  provider: ConsumetProvider = "gogoanime",
  server: string = "gogocdn",
  animeTitle?: string
): Promise<ConsumetStreamInfo | null> {
  try {
    // Always use the addon API which handles Megaplay iframe
    if (animeTitle) {
      const episodeNumber = episodeId.match(/episode-(\d+)$/)?.[1] || "1"
      
      const addonResponse = await fetch(
        `/api/addon/stream?title=${encodeURIComponent(animeTitle)}&episode=${episodeNumber}`
      )
      
      if (addonResponse.ok) {
        const addonData = await addonResponse.json()
        
        // Check if we have sources
        if (addonData.success && addonData.sources && addonData.sources.length > 0) {
          return {
            sources: addonData.sources.map((s: { url: string; quality?: string; isM3U8?: boolean; type?: string }) => ({
              url: s.url,
              quality: s.quality || "Auto",
              isM3U8: s.isM3U8 || false,
              type: s.type || "iframe",
            })),
            subtitles: addonData.subtitles || [],
            isIframe: addonData.isIframe || true,
            isDemo: false,
            provider: addonData.provider || "Megaplay",
          }
        }
      }
    }
    
    // Fallback: try direct episode ID if it's not a demo ID
    if (!episodeId.startsWith("demo-")) {
      const response = await fetch(
        `/api/anime/watch/${encodeURIComponent(episodeId)}?provider=${provider}&server=${server}`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.sources && data.sources.length > 0) {
          return data
        }
      }
    }
    
    return null
  } catch {
    return null
  }
}

// Get recent/popular anime episodes
export async function getRecentEpisodes(
  provider: ConsumetProvider = "gogoanime",
  page: number = 1
): Promise<ConsumetAnimeResult[]> {
  try {
    const response = await fetch(
      `/api/anime/recent?provider=${provider}&page=${page}`
    )
    
    if (!response.ok) {
      return []
    }
    
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.log("[v0] Recent episodes error:", error)
    return []
  }
}

// Get top airing anime
export async function getTopAiring(
  provider: ConsumetProvider = "gogoanime",
  page: number = 1
): Promise<ConsumetAnimeResult[]> {
  try {
    const response = await fetch(
      `/api/anime/top-airing?provider=${provider}&page=${page}`
    )
    
    if (!response.ok) {
      return []
    }
    
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.log("[v0] Top airing error:", error)
    return []
  }
}

// Helper to find best quality source
export function getBestSource(sources: ConsumetStreamSource[]): ConsumetStreamSource | null {
  if (!sources || sources.length === 0) return null
  
  // Priority: 1080p > 720p > 480p > 360p > auto > default > backup
  const qualityOrder = ["1080p", "720p", "480p", "360p", "auto", "default", "backup"]
  
  for (const quality of qualityOrder) {
    const source = sources.find(s => s.quality.toLowerCase() === quality.toLowerCase())
    if (source) return source
  }
  
  // Return first available if no match
  return sources[0]
}

// Convert Consumet anime ID format
// Jikan uses MAL IDs (numbers), Consumet uses slugs
// This function helps find anime in Consumet based on title
export async function findAnimeInConsumet(
  title: string,
  provider: ConsumetProvider = "gogoanime"
): Promise<ConsumetAnimeResult | null> {
  const results = await searchAnime(title, provider)
  
  if (results.length === 0) return null
  
  // Try to find exact match first
  const exactMatch = results.find(
    r => r.title.toLowerCase() === title.toLowerCase()
  )
  
  if (exactMatch) return exactMatch
  
  // Return best match (first result)
  return results[0]
}

// Provider info for UI
export const PROVIDER_INFO: Record<ConsumetProvider, { name: string; status: "online" | "degraded" | "offline" }> = {
  gogoanime: { name: "GogoAnime", status: "online" },
  zoro: { name: "Zoro/Aniwatch", status: "online" },
  animefox: { name: "AnimeFox", status: "degraded" },
  animepahe: { name: "AnimePahe", status: "degraded" },
}
