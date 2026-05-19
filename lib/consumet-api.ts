"use client"

// Consumet API Service for real anime streaming
// API Documentation: https://docs.consumet.org/

const CONSUMET_BASE_URL = "https://api.consumet.org"

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
}

export interface ConsumetStreamInfo {
  headers?: {
    Referer?: string
  }
  sources: ConsumetStreamSource[]
  download?: string
}

// Available providers
export type ConsumetProvider = "gogoanime" | "zoro" | "animefox" | "animepahe"

// Rate limiting helper
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 300 // ms

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  
  lastRequestTime = Date.now()
  return fetch(url)
}

// Search anime by query
export async function searchAnime(
  query: string, 
  provider: ConsumetProvider = "gogoanime"
): Promise<ConsumetAnimeResult[]> {
  try {
    const response = await rateLimitedFetch(
      `${CONSUMET_BASE_URL}/anime/${provider}/${encodeURIComponent(query)}`
    )
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error("[Consumet] Search error:", error)
    return []
  }
}

// Get anime info with episode list
export async function getAnimeInfo(
  animeId: string,
  provider: ConsumetProvider = "gogoanime"
): Promise<ConsumetAnimeInfo | null> {
  try {
    const response = await rateLimitedFetch(
      `${CONSUMET_BASE_URL}/anime/${provider}/info/${animeId}`
    )
    
    if (!response.ok) {
      throw new Error(`Info fetch failed: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error("[Consumet] Info error:", error)
    return null
  }
}

// Get streaming sources for an episode
export async function getStreamingSources(
  episodeId: string,
  provider: ConsumetProvider = "gogoanime",
  server: string = "gogocdn"
): Promise<ConsumetStreamInfo | null> {
  try {
    const response = await rateLimitedFetch(
      `${CONSUMET_BASE_URL}/anime/${provider}/watch/${episodeId}?server=${server}`
    )
    
    if (!response.ok) {
      throw new Error(`Stream fetch failed: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error("[Consumet] Stream error:", error)
    return null
  }
}

// Get recent/popular anime episodes
export async function getRecentEpisodes(
  provider: ConsumetProvider = "gogoanime",
  page: number = 1
): Promise<ConsumetAnimeResult[]> {
  try {
    const response = await rateLimitedFetch(
      `${CONSUMET_BASE_URL}/anime/${provider}/recent-episodes?page=${page}`
    )
    
    if (!response.ok) {
      throw new Error(`Recent episodes fetch failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error("[Consumet] Recent episodes error:", error)
    return []
  }
}

// Get top airing anime
export async function getTopAiring(
  provider: ConsumetProvider = "gogoanime",
  page: number = 1
): Promise<ConsumetAnimeResult[]> {
  try {
    const response = await rateLimitedFetch(
      `${CONSUMET_BASE_URL}/anime/${provider}/top-airing?page=${page}`
    )
    
    if (!response.ok) {
      throw new Error(`Top airing fetch failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error("[Consumet] Top airing error:", error)
    return []
  }
}

// Helper to find best quality source
export function getBestSource(sources: ConsumetStreamSource[]): ConsumetStreamSource | null {
  if (!sources || sources.length === 0) return null
  
  // Priority: 1080p > 720p > 480p > 360p > default > backup
  const qualityOrder = ["1080p", "720p", "480p", "360p", "default", "backup"]
  
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
