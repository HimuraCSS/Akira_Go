/**
 * AllManga.to API Integration
 * Based on: https://github.com/walterwhite-69/AllManga.to-API
 * 
 * Provides direct MP4/M3U8 streams from AllAnime CDN
 * No cookies needed for CDN streams!
 */

const GQL_URL = "https://api.allanime.day/api"
const SITE_URL = "https://allmanga.to"
const CDN_BASE = "https://allanimenews.com"

const GQL_HEADERS = {
  "Origin": SITE_URL,
  "Referer": `${SITE_URL}/`,
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Content-Type": "application/json",
  "Accept": "application/json, text/plain, */*",
}

// GraphQL field definitions
const SHOW_FIELDS = "_id name englishName nativeName thumbnail episodeCount score type status genres availableEpisodes season altNames countryOfOrigin"
const EP_FIELDS = "_id episodeIdNum notes thumbnails vidInforssub vidInforsdub vidInforsraw"

// Types
export interface AllMangaShow {
  _id: string
  name: string
  englishName?: string
  nativeName?: string
  thumbnail?: string
  episodeCount?: number
  score?: number
  type?: string
  status?: string
  genres?: string[]
  availableEpisodes?: {
    sub: number
    dub: number
    raw: number
  }
  season?: {
    quarter: string
    year: number
  }
  altNames?: string[]
}

export interface AllMangaEpisode {
  _id: string
  episodeIdNum: number
  notes?: string
  thumbnails?: string[]
  vidInforssub?: VidInfo
  vidInforsdub?: VidInfo
  vidInforsraw?: VidInfo
  streams?: AllMangaStream[]
}

interface VidInfo {
  vidPath?: string
  vidResolution?: number
  vidSize?: number
  vidDuration?: number
}

export interface AllMangaStream {
  server: string
  translationType: "sub" | "dub" | "raw"
  url: string
  rawPath?: string
  quality: string
  sizeMB: number
  durationSec?: number
  type: "mp4" | "hls"
  headers: {
    Referer: string
    Origin: string
  }
}

export interface AllMangaSearchResult {
  results: AllMangaShow[]
  page: number
  limit: number
  hasNextPage: boolean
}

// URL decoder (XOR decryption)
function decodeUrl(raw: string): string {
  if (!raw) return raw
  
  // XOR decode: --<hex>
  if (raw.startsWith("--")) {
    try {
      const hex = raw.slice(2)
      const bytes = Buffer.from(hex, "hex")
      const decoded = Buffer.from(bytes.map(b => b ^ 56))
      return decoded.toString("utf-8")
    } catch {
      // fallback
    }
  }
  
  // ap/ prefix: hex decode
  if (raw.startsWith("ap/")) {
    try {
      return Buffer.from(raw.slice(3), "hex").toString("utf-8")
    } catch {
      // fallback
    }
  }
  
  return raw
}

function cdnUrl(path: string): string {
  if (!path) return ""
  return path.startsWith("http") ? path : `${CDN_BASE}/${path.replace(/^\//, "")}`
}

function buildStreams(ep: AllMangaEpisode): AllMangaStream[] {
  const out: AllMangaStream[] = []
  
  const infos: Array<{ trans: "sub" | "dub" | "raw", field: keyof AllMangaEpisode }> = [
    { trans: "sub", field: "vidInforssub" },
    { trans: "dub", field: "vidInforsdub" },
    { trans: "raw", field: "vidInforsraw" },
  ]
  
  for (const { trans, field } of infos) {
    const info = ep[field] as VidInfo | undefined
    if (!info?.vidPath) continue
    
    out.push({
      server: "allanime-cdn",
      translationType: trans,
      url: cdnUrl(info.vidPath),
      rawPath: info.vidPath,
      quality: `${info.vidResolution || ""}p`,
      sizeMB: Math.round((info.vidSize || 0) / 1048576 * 10) / 10,
      durationSec: info.vidDuration,
      type: "mp4",
      headers: {
        Referer: `${CDN_BASE}/`,
        Origin: CDN_BASE,
      },
    })
  }
  
  return out
}

// GraphQL query builders
function qSearch(query: string, limit: number = 26, page: number = 1, trans: string = "", country: string = ""): string {
  const searchParts = [`sortBy:Latest_Update`, `query:"${query}"`]
  let args = `search:{${searchParts.join(",")}},limit:${limit},page:${page}`
  if (trans) args += `,translationType:${trans}`
  if (country) args += `,countryOrigin:${country}`
  return `{shows(${args}){edges{${SHOW_FIELDS}}}}`
}

function qEpisodes(showId: string, epStart: number = 1, epEnd: number = 9999): string {
  return `{episodeInfos(showId:"${showId}",episodeNumStart:${epStart},episodeNumEnd:${epEnd}){${EP_FIELDS}}}`
}

function qShow(showId: string): string {
  return `{show(_id:"${showId}"){${SHOW_FIELDS} description tags studios airedStart airedEnd}}`
}

// API functions
async function gql<T = unknown>(query: string): Promise<T> {
  const response = await fetch(GQL_URL, {
    method: "POST",
    headers: GQL_HEADERS,
    body: JSON.stringify({ query }),
  })
  
  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`)
  }
  
  const data = await response.json()
  
  if (data.errors?.length) {
    throw new Error(data.errors[0]?.message || "GraphQL error")
  }
  
  return data
}

/**
 * Search anime by title
 */
export async function searchAnime(
  query: string,
  options: {
    limit?: number
    page?: number
    translationType?: "sub" | "dub" | "raw"
    countryOrigin?: "JP" | "CN" | "KR"
  } = {}
): Promise<AllMangaSearchResult> {
  const { limit = 26, page = 1, translationType = "", countryOrigin = "" } = options
  
  const result = await gql<{
    data: { shows: { edges: AllMangaShow[] } }
  }>(qSearch(query, limit, page, translationType, countryOrigin))
  
  const edges = result.data?.shows?.edges || []
  
  return {
    results: edges,
    page,
    limit,
    hasNextPage: edges.length === limit,
  }
}

/**
 * Get anime info by AllManga ID
 */
export async function getAnimeInfo(showId: string): Promise<AllMangaShow | null> {
  const result = await gql<{
    data: { show: AllMangaShow | null }
  }>(qShow(showId))
  
  return result.data?.show || null
}

/**
 * Get episodes with optional direct streams
 */
export async function getEpisodes(
  showId: string,
  options: {
    episodeStart?: number
    episodeEnd?: number
    includeStreams?: boolean
  } = {}
): Promise<{
  showId: string
  total: number
  episodes: AllMangaEpisode[]
}> {
  const { episodeStart = 1, episodeEnd = 9999, includeStreams = false } = options
  
  const result = await gql<{
    data: { episodeInfos: AllMangaEpisode[] }
  }>(qEpisodes(showId, episodeStart, episodeEnd))
  
  let episodes = result.data?.episodeInfos || []
  
  // Sort by episode number
  episodes = episodes.sort((a, b) => (a.episodeIdNum || 0) - (b.episodeIdNum || 0))
  
  // Process thumbnails and streams
  for (const ep of episodes) {
    if (ep.thumbnails) {
      ep.thumbnails = ep.thumbnails.map(t => 
        t.startsWith("http") ? t : cdnUrl(t)
      )
    }
    
    if (includeStreams) {
      ep.streams = buildStreams(ep)
    }
  }
  
  return {
    showId,
    total: episodes.length,
    episodes,
  }
}

/**
 * Search by MAL ID (requires mapping via title search)
 */
export async function searchByMalId(malId: number, title: string): Promise<AllMangaShow | null> {
  // AllManga doesn't have direct MAL ID lookup
  // We search by title and try to match
  const results = await searchAnime(title, { limit: 10 })
  
  // Try to find exact match by title
  const titleLower = title.toLowerCase()
  
  for (const show of results.results) {
    const names = [
      show.name,
      show.englishName,
      show.nativeName,
      ...(show.altNames || []),
    ].filter(Boolean).map(n => n!.toLowerCase())
    
    if (names.some(n => n === titleLower || n.includes(titleLower) || titleLower.includes(n))) {
      return show
    }
  }
  
  // Return first result as fallback
  return results.results[0] || null
}

/**
 * Get direct streams for an episode
 * This is the main function for getting playable URLs!
 */
export async function getEpisodeStreams(
  showId: string,
  episode: number
): Promise<AllMangaStream[]> {
  const result = await getEpisodes(showId, {
    episodeStart: episode,
    episodeEnd: episode,
    includeStreams: true,
  })
  
  const ep = result.episodes.find(e => e.episodeIdNum === episode)
  return ep?.streams || []
}

/**
 * Complete flow: Search anime and get episode streams
 */
export async function getStreamsByTitle(
  title: string,
  episode: number,
  translationType: "sub" | "dub" = "sub"
): Promise<{
  anime: AllMangaShow | null
  streams: AllMangaStream[]
  error?: string
}> {
  try {
    // 1. Search for anime
    const anime = await searchByMalId(0, title)
    
    if (!anime) {
      return { anime: null, streams: [], error: "Anime not found" }
    }
    
    // 2. Get episode streams
    const streams = await getEpisodeStreams(anime._id, episode)
    
    // 3. Filter by translation type
    const filtered = streams.filter(s => s.translationType === translationType)
    
    return {
      anime,
      streams: filtered.length > 0 ? filtered : streams,
    }
  } catch (error) {
    return {
      anime: null,
      streams: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Export decoder for use in proxies
export { decodeUrl, cdnUrl }
