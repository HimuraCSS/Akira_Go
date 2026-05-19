"use client"

import type { AnimeData } from "@/components/anitracker/anime-card"

// ============================================================================
// JIKAN API SERVICE - MyAnimeList Unofficial API
// Base URL: https://api.jikan.moe/v4
// No authentication required
// ============================================================================

const JIKAN_BASE_URL = "https://api.jikan.moe/v4"

// Rate limiting: Jikan has a 3 requests per second limit
// We implement a simple queue to respect this
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 350 // ms between requests

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  
  lastRequestTime = Date.now()
  return fetch(url)
}

// Types matching Jikan API response
interface JikanAnime {
  mal_id: number
  title: string
  title_japanese: string
  images: {
    jpg: {
      image_url: string
      large_image_url: string
    }
    webp: {
      image_url: string
      large_image_url: string
    }
  }
  trailer?: {
    images?: {
      maximum_image_url?: string
    }
  }
  score: number | null
  episodes: number | null
  status: string
  synopsis: string | null
  genres: { name: string }[]
  year: number | null
  aired?: {
    prop?: {
      from?: {
        year?: number
      }
    }
  }
  studios: { name: string }[]
  duration: string
  rating: string
  popularity: number
  members: number
}

interface JikanResponse<T> {
  data: T
  pagination?: {
    last_visible_page: number
    has_next_page: boolean
  }
}

// Transform Jikan anime to our AnimeData format
function transformJikanAnime(jikan: JikanAnime): AnimeData {
  const animeYear = jikan.year || jikan.aired?.prop?.from?.year || new Date().getFullYear()
  
  return {
    id: jikan.mal_id.toString(),
    title: jikan.title,
    japaneseTitle: jikan.title_japanese,
    image: jikan.images.webp?.large_image_url || jikan.images.jpg?.large_image_url || jikan.images.jpg?.image_url,
    bannerImage: jikan.trailer?.images?.maximum_image_url || jikan.images.webp?.large_image_url || jikan.images.jpg?.large_image_url,
    score: jikan.score || 0,
    episodes: jikan.episodes || 0,
    status: translateStatus(jikan.status),
    synopsis: jikan.synopsis || "Sinopse não disponível.",
    genres: jikan.genres.map(g => translateGenre(g.name)),
    year: animeYear,
    studio: jikan.studios.map(s => s.name).join(", ") || "Desconhecido",
    duration: jikan.duration || "24min/ep",
  }
}

// Translate status to Portuguese
function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "Finished Airing": "Completo",
    "Currently Airing": "Em Exibição",
    "Not yet aired": "Em Breve",
  }
  return statusMap[status] || status
}

// Translate common genres to Portuguese
function translateGenre(genre: string): string {
  const genreMap: Record<string, string> = {
    "Action": "Ação",
    "Adventure": "Aventura",
    "Comedy": "Comédia",
    "Drama": "Drama",
    "Fantasy": "Fantasia",
    "Horror": "Horror",
    "Mystery": "Mistério",
    "Romance": "Romance",
    "Sci-Fi": "Sci-Fi",
    "Slice of Life": "Slice of Life",
    "Sports": "Esportes",
    "Supernatural": "Sobrenatural",
    "Thriller": "Thriller",
    "Suspense": "Suspense",
    "Award Winning": "Premiado",
    "Avant Garde": "Avant Garde",
    "Boys Love": "Boys Love",
    "Girls Love": "Girls Love",
    "Gourmet": "Gastronomia",
    "Ecchi": "Ecchi",
  }
  return genreMap[genre] || genre
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch top anime (by score)
 */
export async function fetchTopAnime(limit: number = 25): Promise<AnimeData[]> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/top/anime?filter=airing&limit=${limit}`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data: JikanResponse<JikanAnime[]> = await response.json()
    return data.data.map(transformJikanAnime)
  } catch (error) {
    console.error("Failed to fetch top anime:", error)
    return []
  }
}

/**
 * Fetch currently airing anime (seasonal)
 */
export async function fetchAiringAnime(limit: number = 25): Promise<AnimeData[]> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/seasons/now?limit=${limit}`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data: JikanResponse<JikanAnime[]> = await response.json()
    return data.data.map(transformJikanAnime)
  } catch (error) {
    console.error("Failed to fetch airing anime:", error)
    return []
  }
}

/**
 * Fetch upcoming anime
 */
export async function fetchUpcomingAnime(limit: number = 25): Promise<AnimeData[]> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/seasons/upcoming?limit=${limit}`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data: JikanResponse<JikanAnime[]> = await response.json()
    return data.data.map(transformJikanAnime)
  } catch (error) {
    console.error("Failed to fetch upcoming anime:", error)
    return []
  }
}

/**
 * Fetch popular anime (by members/popularity)
 */
export async function fetchPopularAnime(limit: number = 25): Promise<AnimeData[]> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/top/anime?filter=bypopularity&limit=${limit}`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data: JikanResponse<JikanAnime[]> = await response.json()
    return data.data.map(transformJikanAnime)
  } catch (error) {
    console.error("Failed to fetch popular anime:", error)
    return []
  }
}

/**
 * Search anime by query
 */
export async function searchAnime(query: string, limit: number = 25): Promise<AnimeData[]> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=${limit}&sfw=true`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data: JikanResponse<JikanAnime[]> = await response.json()
    return data.data.map(transformJikanAnime)
  } catch (error) {
    console.error("Failed to search anime:", error)
    return []
  }
}

/**
 * Fetch anime by ID
 */
export async function fetchAnimeById(id: string | number): Promise<AnimeData | null> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/anime/${id}/full`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data: JikanResponse<JikanAnime> = await response.json()
    return transformJikanAnime(data.data)
  } catch (error) {
    console.error("Failed to fetch anime by ID:", error)
    return null
  }
}

/**
 * Fetch anime recommendations based on an anime ID
 */
export async function fetchAnimeRecommendations(id: string | number, limit: number = 10): Promise<AnimeData[]> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/anime/${id}/recommendations`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data: JikanResponse<{ entry: JikanAnime }[]> = await response.json()
    return data.data.slice(0, limit).map(item => transformJikanAnime(item.entry))
  } catch (error) {
    console.error("Failed to fetch recommendations:", error)
    return []
  }
}

/**
 * Fetch random anime
 */
export async function fetchRandomAnime(): Promise<AnimeData | null> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/random/anime`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data: JikanResponse<JikanAnime> = await response.json()
    return transformJikanAnime(data.data)
  } catch (error) {
    console.error("Failed to fetch random anime:", error)
    return null
  }
}

/**
 * Fetch anime by genre
 */
export async function fetchAnimeByGenre(genreId: number, limit: number = 25): Promise<AnimeData[]> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/anime?genres=${genreId}&order_by=score&sort=desc&limit=${limit}`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data: JikanResponse<JikanAnime[]> = await response.json()
    return data.data.map(transformJikanAnime)
  } catch (error) {
    console.error("Failed to fetch anime by genre:", error)
    return []
  }
}

// Genre IDs for reference (Jikan/MAL)
export const GENRE_IDS = {
  ACTION: 1,
  ADVENTURE: 2,
  COMEDY: 4,
  DRAMA: 8,
  FANTASY: 10,
  HORROR: 14,
  MYSTERY: 7,
  ROMANCE: 22,
  SCI_FI: 24,
  SLICE_OF_LIFE: 36,
  SPORTS: 30,
  SUPERNATURAL: 37,
  THRILLER: 41,
} as const
