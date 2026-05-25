import * as cheerio from "cheerio"
import { HIANIME_BASE_URL, HIANIME_AJAX_URL, DEFAULT_HEADERS, SERVER_NAMES, type ServerType } from "./constants"

// Types
export interface SearchResult {
  id: string
  name: string
  jname: string
  poster: string
  duration: string
  type: string
  rating: string
  episodes: {
    sub: number
    dub: number
  }
}

export interface AnimeInfo {
  id: string
  name: string
  jname: string
  poster: string
  description: string
  stats: {
    rating: string
    quality: string
    duration: string
    type: string
  }
  episodes: {
    sub: number
    dub: number
  }
}

export interface Episode {
  number: number
  title: string
  episodeId: string
  isFiller: boolean
}

export interface Server {
  serverName: string
  serverId: number
  type: ServerType
}

export interface StreamSource {
  url: string
  quality: string
  isM3U8: boolean
  type: "hls" | "mp4"
}

export interface Subtitle {
  url: string
  lang: string
  default?: boolean
}

export interface StreamInfo {
  sources: StreamSource[]
  subtitles: Subtitle[]
  intro?: { start: number; end: number }
  outro?: { start: number; end: number }
  server: string
  headers?: Record<string, string>
}

// Search anime
export async function searchAnime(query: string, page: number = 1): Promise<{
  results: SearchResult[]
  hasNextPage: boolean
  totalPages: number
}> {
  const url = `${HIANIME_BASE_URL}/search?keyword=${encodeURIComponent(query)}&page=${page}`
  
  const res = await fetch(url, { headers: DEFAULT_HEADERS })
  const html = await res.text()
  const $ = cheerio.load(html)
  
  const results: SearchResult[] = []
  
  $(".film_list-wrap .flw-item").each((_, el) => {
    const $el = $(el)
    // HiAnime now uses absolute URLs like https://hianime.ms/details/one-piece-1a877
    const fullUrl = $el.find(".film-poster a.film-poster-ahref").attr("href") || 
                    $el.find(".film-poster a").attr("href") || ""
    // Extract ID from full URL or relative path
    const id = fullUrl.replace(/https?:\/\/[^/]+\/details\//, "").replace(/^\//, "") || ""
    
    const name = $el.find(".film-name a").text().trim() ||
                 $el.find(".film-poster a").attr("aria-label")?.replace("Watch ", "") || ""
    const jname = $el.find(".film-name a").attr("data-jname") || ""
    // HiAnime now uses src directly instead of data-src for lazy loading
    const poster = $el.find(".film-poster img").attr("src") || 
                   $el.find(".film-poster img").attr("data-src") || ""
    const duration = $el.find(".fd-infor .fdi-item.fdi-duration").text().trim()
    const type = $el.find(".fd-infor .fdi-item:first-child").text().trim()
    const rating = $el.find(".film-poster .tick-rate").text().trim()
    
    const subEps = parseInt($el.find(".tick-sub").text().trim()) || 0
    const dubEps = parseInt($el.find(".tick-dub").text().trim()) || 0
    
    if (id) {
      results.push({
        id,
        name,
        jname,
        poster,
        duration,
        type,
        rating,
        episodes: { sub: subEps, dub: dubEps }
      })
    }
  })
  
  const totalPages = parseInt($(".pagination .page-item:last-child a").attr("href")?.match(/page=(\d+)/)?.[1] || "1")
  const hasNextPage = page < totalPages
  
  return { results, hasNextPage, totalPages }
}

// Get anime info
export async function getAnimeInfo(animeId: string): Promise<AnimeInfo | null> {
  // HiAnime now uses /details/ prefix for anime pages
  const url = `${HIANIME_BASE_URL}/details/${animeId}`
  
  console.log("[v0] Fetching anime info from:", url)
  const res = await fetch(url, { headers: DEFAULT_HEADERS })
  console.log("[v0] Response status:", res.status)
  const html = await res.text()
  console.log("[v0] HTML length:", html.length)
  const $ = cheerio.load(html)
  
  // Updated selector: h1.film-name or .anisc-detail .film-name
  const name = $("h1.film-name").text().trim() || $(".anisc-detail .film-name").text().trim()
  console.log("[v0] Found name:", name)
  if (!name) return null
  
  const jname = $(".anisc-detail .film-name").attr("data-jname") || ""
  const poster = $(".film-poster img").attr("src") || ""
  const description = $(".film-description .text").text().trim()
  
  const rating = $(".film-stats .tick-pg").text().trim()
  const quality = $(".film-stats .tick-quality").text().trim()
  const duration = $(".film-stats .tick-item:contains('min')").text().trim()
  const type = $(".film-stats .tick-item:first-child").text().trim()
  
  const subEps = parseInt($(".film-stats .tick-sub").text().trim()) || 0
  const dubEps = parseInt($(".film-stats .tick-dub").text().trim()) || 0
  
  return {
    id: animeId,
    name,
    jname,
    poster,
    description,
    stats: { rating, quality, duration, type },
    episodes: { sub: subEps, dub: dubEps }
  }
}

// Get episodes
export async function getEpisodes(animeId: string): Promise<Episode[]> {
  // Extract the numeric ID from the anime URL
  const idMatch = animeId.match(/-(\d+)$/)
  const numericId = idMatch ? idMatch[1] : animeId
  
  const url = `${HIANIME_AJAX_URL}/v2/episode/list/${numericId}`
  
  const res = await fetch(url, {
    headers: {
      ...DEFAULT_HEADERS,
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json, text/javascript, */*; q=0.01",
    }
  })
  
  const data = await res.json()
  const $ = cheerio.load(data.html)
  
  const episodes: Episode[] = []
  
  $(".ss-list a").each((_, el) => {
    const $el = $(el)
    const href = $el.attr("href") || ""
    const episodeId = href.split("?ep=")[1] || ""
    const number = parseInt($el.attr("data-number") || "0")
    const title = $el.attr("title") || `Episode ${number}`
    const isFiller = $el.hasClass("ssl-item-filler")
    
    if (episodeId) {
      episodes.push({ number, title, episodeId, isFiller })
    }
  })
  
  return episodes
}

// Get episode servers
export async function getEpisodeServers(episodeId: string): Promise<{
  sub: Server[]
  dub: Server[]
  raw: Server[]
}> {
  const url = `${HIANIME_AJAX_URL}/v2/episode/servers?episodeId=${episodeId}`
  
  const res = await fetch(url, {
    headers: {
      ...DEFAULT_HEADERS,
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json, text/javascript, */*; q=0.01",
    }
  })
  
  const data = await res.json()
  const $ = cheerio.load(data.html)
  
  const servers: { sub: Server[]; dub: Server[]; raw: Server[] } = {
    sub: [],
    dub: [],
    raw: []
  }
  
  $(".servers-sub .server-item").each((_, el) => {
    const $el = $(el)
    servers.sub.push({
      serverName: SERVER_NAMES[$el.attr("data-server-id") || ""] || $el.text().trim(),
      serverId: parseInt($el.attr("data-id") || "0"),
      type: "sub"
    })
  })
  
  $(".servers-dub .server-item").each((_, el) => {
    const $el = $(el)
    servers.dub.push({
      serverName: SERVER_NAMES[$el.attr("data-server-id") || ""] || $el.text().trim(),
      serverId: parseInt($el.attr("data-id") || "0"),
      type: "dub"
    })
  })
  
  $(".servers-raw .server-item").each((_, el) => {
    const $el = $(el)
    servers.raw.push({
      serverName: SERVER_NAMES[$el.attr("data-server-id") || ""] || $el.text().trim(),
      serverId: parseInt($el.attr("data-id") || "0"),
      type: "raw"
    })
  })
  
  return servers
}

// Get streaming sources
export async function getStreamingSources(
  episodeId: string, 
  serverId: number,
  serverType: ServerType = "sub"
): Promise<StreamInfo | null> {
  const url = `${HIANIME_AJAX_URL}/v2/episode/sources?id=${serverId}`
  
  const res = await fetch(url, {
    headers: {
      ...DEFAULT_HEADERS,
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json, text/javascript, */*; q=0.01",
    }
  })
  
  const data = await res.json()
  
  if (!data.link) {
    return null
  }
  
  // The link is an embed URL that we need to extract the actual stream from
  const embedUrl = data.link
  
  // Try to extract from MegaCloud/RapidCloud
  const streamInfo = await extractFromEmbed(embedUrl)
  
  if (streamInfo) {
    return {
      ...streamInfo,
      server: data.type || serverType,
    }
  }
  
  // Fallback: return the embed URL as iframe
  return {
    sources: [{
      url: embedUrl,
      quality: "auto",
      isM3U8: false,
      type: "mp4" as const,
    }],
    subtitles: [],
    server: serverType,
  }
}

// Extract stream from embed URL (MegaCloud/RapidCloud)
async function extractFromEmbed(embedUrl: string): Promise<Omit<StreamInfo, "server"> | null> {
  try {
    // Parse the embed URL
    const url = new URL(embedUrl)
    const embedId = url.pathname.split("/").pop() || ""
    
    // Determine the extractor based on host
    if (url.host.includes("megacloud") || url.host.includes("rapid-cloud") || url.host.includes("rabbitstream")) {
      return await extractMegaCloud(embedUrl, embedId)
    }
    
    if (url.host.includes("vidstreaming") || url.host.includes("vidcloud")) {
      return await extractVidStreaming(embedUrl)
    }
    
    return null
  } catch (error) {
    console.error("[HiAnime] Extract error:", error)
    return null
  }
}

// MegaCloud/RapidCloud extractor
async function extractMegaCloud(embedUrl: string, embedId: string): Promise<Omit<StreamInfo, "server"> | null> {
  try {
    const url = new URL(embedUrl)
    const apiUrl = `https://${url.host}/embed-2/ajax/e-1/getSources?id=${embedId}`
    
    const res = await fetch(apiUrl, {
      headers: {
        ...DEFAULT_HEADERS,
        "Referer": embedUrl,
        "X-Requested-With": "XMLHttpRequest",
      }
    })
    
    const data = await res.json()
    
    if (!data.sources) {
      return null
    }
    
    const sources: StreamSource[] = []
    const subtitles: Subtitle[] = []
    
    // Handle encrypted sources
    let sourcesData = data.sources
    if (typeof data.sources === "string") {
      // Sources are encrypted, need to decrypt
      // For now, fall back to embed
      return null
    }
    
    // Parse sources
    if (Array.isArray(sourcesData)) {
      for (const source of sourcesData) {
        sources.push({
          url: source.file || source.url,
          quality: source.label || "auto",
          isM3U8: source.file?.includes(".m3u8") || source.type === "hls",
          type: source.file?.includes(".m3u8") ? "hls" : "mp4",
        })
      }
    }
    
    // Parse subtitles/tracks
    if (data.tracks && Array.isArray(data.tracks)) {
      for (const track of data.tracks) {
        if (track.kind === "captions" || track.kind === "subtitles") {
          subtitles.push({
            url: track.file,
            lang: track.label || "Unknown",
            default: track.default || false,
          })
        }
      }
    }
    
    return {
      sources,
      subtitles,
      intro: data.intro ? { start: data.intro.start, end: data.intro.end } : undefined,
      outro: data.outro ? { start: data.outro.start, end: data.outro.end } : undefined,
      headers: { Referer: embedUrl },
    }
  } catch (error) {
    console.error("[HiAnime] MegaCloud extract error:", error)
    return null
  }
}

// VidStreaming extractor
async function extractVidStreaming(embedUrl: string): Promise<Omit<StreamInfo, "server"> | null> {
  try {
    const res = await fetch(embedUrl, { headers: DEFAULT_HEADERS })
    const html = await res.text()
    
    // Extract source from script
    const sourceMatch = html.match(/file:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i)
    if (!sourceMatch) {
      return null
    }
    
    return {
      sources: [{
        url: sourceMatch[1],
        quality: "auto",
        isM3U8: true,
        type: "hls",
      }],
      subtitles: [],
      headers: { Referer: embedUrl },
    }
  } catch (error) {
    console.error("[HiAnime] VidStreaming extract error:", error)
    return null
  }
}
