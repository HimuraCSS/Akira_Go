"use client"

import type { AnimeData } from "@/components/anitracker/anime-card"

// ============================================================================
// JIKAN API SERVICE - MyAnimeList Unofficial API
// Base URL: https://api.jikan.moe/v4
// No authentication required
// ============================================================================

const JIKAN_BASE_URL = "https://api.jikan.moe/v4"

// Rate limiting: Jikan has a 3 requests per second limit
// We implement a queue with exponential backoff
let lastRequestTime = 0
let consecutiveRequests = 0
const MIN_REQUEST_INTERVAL = 400 // ms between requests (increased from 350)
const BACKOFF_MULTIPLIER = 1.5

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function rateLimitedFetch(url: string): Promise<Response> {
  // Check cache first
  const cached = cache.get(url)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  }

  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  // Calculate delay with backoff for consecutive requests
  const delay = MIN_REQUEST_INTERVAL * (1 + consecutiveRequests * 0.2)
  
  if (timeSinceLastRequest < delay) {
    await new Promise(resolve => setTimeout(resolve, delay - timeSinceLastRequest))
  }
  
  lastRequestTime = Date.now()
  consecutiveRequests++
  
  // Reset consecutive counter after 2 seconds of inactivity
  setTimeout(() => {
    if (Date.now() - lastRequestTime > 2000) {
      consecutiveRequests = 0
    }
  }, 2000)
  
  const response = await fetch(url)
  
  // Cache successful responses
  if (response.ok) {
    const data = await response.json()
    cache.set(url, { data, timestamp: Date.now() })
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  }
  
  // If rate limited, wait and retry once
  if (response.status === 429) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    lastRequestTime = Date.now()
    return fetch(url)
  }
  
  return response
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

// ============================================================================
// ADDITIONAL API FUNCTIONS
// ============================================================================

/**
 * Fetch anime schedule (weekly airing schedule)
 */
export async function fetchAnimeSchedule(day?: string): Promise<Record<string, AnimeData[]>> {
  try {
    const url = day 
      ? `${JIKAN_BASE_URL}/schedules?filter=${day}&sfw=true`
      : `${JIKAN_BASE_URL}/schedules?sfw=true`
    
    const response = await rateLimitedFetch(url)
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data: JikanResponse<JikanAnime[]> = await response.json()
    
    // Group by day if fetching all days
    if (!day) {
      const schedule: Record<string, AnimeData[]> = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      }
      
      data.data.forEach(anime => {
        const broadcastDay = anime.broadcast?.day?.toLowerCase() || "unknown"
        const dayKey = broadcastDay.replace("s", "") // "mondays" -> "monday"
        if (schedule[dayKey]) {
          schedule[dayKey].push(transformJikanAnime(anime))
        }
      })
      
      return schedule
    }
    
    return { [day]: data.data.map(transformJikanAnime) }
  } catch (error) {
    console.error("Failed to fetch anime schedule:", error)
    return {}
  }
}

/**
 * Fetch anime episodes list
 */
export async function fetchAnimeEpisodes(malId: string | number, page: number = 1): Promise<{
  episodes: Array<{
    mal_id: number
    title: string
    title_japanese: string | null
    title_romanji: string | null
    aired: string | null
    filler: boolean
    recap: boolean
  }>
  pagination: { has_next_page: boolean; last_visible_page: number }
}> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/anime/${malId}/episodes?page=${page}`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data = await response.json()
    return {
      episodes: data.data || [],
      pagination: data.pagination || { has_next_page: false, last_visible_page: 1 }
    }
  } catch (error) {
    console.error("Failed to fetch anime episodes:", error)
    return { episodes: [], pagination: { has_next_page: false, last_visible_page: 1 } }
  }
}

/**
 * Fetch anime characters
 */
export async function fetchAnimeCharacters(malId: string | number): Promise<Array<{
  character: {
    mal_id: number
    name: string
    images: { jpg: { image_url: string }; webp: { image_url: string } }
  }
  role: string
  voice_actors: Array<{
    person: { mal_id: number; name: string; images: { jpg: { image_url: string } } }
    language: string
  }>
}>> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/anime/${malId}/characters`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Failed to fetch anime characters:", error)
    return []
  }
}

/**
 * Fetch anime relations (sequels, prequels, etc.)
 */
export async function fetchAnimeRelations(malId: string | number): Promise<Array<{
  relation: string
  entry: Array<{
    mal_id: number
    type: string
    name: string
    url: string
  }>
}>> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/anime/${malId}/relations`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Failed to fetch anime relations:", error)
    return []
  }
}

/**
 * Fetch anime streaming links (official)
 */
export async function fetchAnimeStreaming(malId: string | number): Promise<Array<{
  name: string
  url: string
}>> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/anime/${malId}/streaming`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Failed to fetch anime streaming:", error)
    return []
  }
}

/**
 * Fetch seasonal anime with specific year/season
 */
export async function fetchSeasonAnime(
  year: number, 
  season: "winter" | "spring" | "summer" | "fall",
  limit: number = 25
): Promise<AnimeData[]> {
  try {
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/seasons/${year}/${season}?limit=${limit}&sfw=true`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data: JikanResponse<JikanAnime[]> = await response.json()
    return data.data.map(transformJikanAnime)
  } catch (error) {
    console.error("Failed to fetch season anime:", error)
    return []
  }
}

/**
 * Fetch all available seasons
 */
export async function fetchSeasonsList(): Promise<Array<{ year: number; seasons: string[] }>> {
  try {
    const response = await rateLimitedFetch(`${JIKAN_BASE_URL}/seasons`)
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Failed to fetch seasons list:", error)
    return []
  }
}

/**
 * Advanced anime search with filters
 */
export async function searchAnimeAdvanced(params: {
  q?: string
  page?: number
  limit?: number
  type?: "tv" | "movie" | "ova" | "special" | "ona" | "music"
  score?: number
  min_score?: number
  max_score?: number
  status?: "airing" | "complete" | "upcoming"
  rating?: "g" | "pg" | "pg13" | "r17" | "r" | "rx"
  genres?: number[]
  genres_exclude?: number[]
  order_by?: "mal_id" | "title" | "start_date" | "end_date" | "episodes" | "score" | "scored_by" | "rank" | "popularity" | "members" | "favorites"
  sort?: "asc" | "desc"
  start_date?: string
  end_date?: string
  sfw?: boolean
}): Promise<{ data: AnimeData[]; pagination: { has_next_page: boolean; last_visible_page: number; current_page: number } }> {
  try {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          searchParams.set(key, value.join(","))
        } else {
          searchParams.set(key, String(value))
        }
      }
    })
    
    // Always enable SFW filter by default
    if (!searchParams.has("sfw")) {
      searchParams.set("sfw", "true")
    }
    
    const response = await rateLimitedFetch(
      `${JIKAN_BASE_URL}/anime?${searchParams.toString()}`
    )
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data = await response.json()
    return {
      data: data.data.map(transformJikanAnime),
      pagination: data.pagination || { has_next_page: false, last_visible_page: 1, current_page: 1 }
    }
  } catch (error) {
    console.error("Failed to search anime:", error)
    return { data: [], pagination: { has_next_page: false, last_visible_page: 1, current_page: 1 } }
  }
}

/**
 * Fetch all anime genres
 */
export async function fetchAnimeGenres(): Promise<Array<{ mal_id: number; name: string; count: number }>> {
  try {
    const response = await rateLimitedFetch(`${JIKAN_BASE_URL}/genres/anime`)
    
    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Failed to fetch anime genres:", error)
    return []
  }
}

/**
 * Get current season info
 */
export function getCurrentSeason(): { year: number; season: "winter" | "spring" | "summer" | "fall" } {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  
  let season: "winter" | "spring" | "summer" | "fall"
  
  if (month >= 1 && month <= 3) {
    season = "winter"
  } else if (month >= 4 && month <= 6) {
    season = "spring"
  } else if (month >= 7 && month <= 9) {
    season = "summer"
  } else {
    season = "fall"
  }
  
  return { year, season }
}

/**
 * Translate season name to Portuguese
 */
export function translateSeason(season: string): string {
  const seasonMap: Record<string, string> = {
    winter: "Inverno",
    spring: "Primavera",
    summer: "Verao",
    fall: "Outono",
  }
  return seasonMap[season] || season
}

/**
 * Translate day of week to Portuguese
 */
export function translateDay(day: string): string {
  const dayMap: Record<string, string> = {
    monday: "Segunda",
    tuesday: "Terca",
    wednesday: "Quarta",
    thursday: "Quinta",
    friday: "Sexta",
    saturday: "Sabado",
    sunday: "Domingo",
  }
  return dayMap[day.toLowerCase()] || day
}

// Extended JikanAnime type with broadcast info
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
  broadcast?: {
    day?: string
    time?: string
    timezone?: string
  }
}
