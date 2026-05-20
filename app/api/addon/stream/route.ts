import { NextResponse } from "next/server"
import { searchAnime, getEpisodes, getEpisodeServers, getStreamingSources } from "@/lib/hianime/scraper"

// Jikan API for anime metadata (MyAnimeList) - fallback
const JIKAN_BASE = "https://api.jikan.moe/v4"

// Megaplay embed URL format (fallback)
const MEGAPLAY_BASE = "https://megaplay.buzz"

// M3U8 Proxy URL
const M3U8_PROXY = "/api/proxy/m3u8"

interface StreamSource {
  url: string
  quality: string
  isM3U8: boolean
  type?: string
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

// Proxy M3U8 URL to avoid CORS
function proxyUrl(url: string, headers?: Record<string, string>): string {
  const baseProxy = `${M3U8_PROXY}?url=${encodeURIComponent(url)}`
  if (headers) {
    return `${baseProxy}&headers=${encodeURIComponent(JSON.stringify(headers))}`
  }
  return baseProxy
}

// Search anime in Jikan (MyAnimeList) to get MAL ID for Megaplay fallback
async function searchJikan(title: string): Promise<{ mal_id: number; title: string } | null> {
  const searchTerms = [title, normalizeTitle(title), title.split(":")[0].trim()]
  
  for (const term of searchTerms) {
    try {
      const url = `${JIKAN_BASE}/anime?q=${encodeURIComponent(term)}&limit=5&sfw=true`
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: "application/json" },
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      const results = data.data || []
      
      // Find best match
      const normalizedSearch = normalizeTitle(term)
      for (const anime of results) {
        const titles = [
          anime.title?.toLowerCase(),
          anime.title_english?.toLowerCase(),
          ...(anime.titles?.map((t: { title: string }) => t.title.toLowerCase()) || [])
        ].filter(Boolean)
        
        for (const t of titles) {
          if (t.includes(normalizedSearch) || normalizedSearch.includes(t)) {
            return { mal_id: anime.mal_id, title: anime.title }
          }
        }
      }
      
      // Return first result if no exact match
      if (results.length > 0) {
        return { mal_id: results[0].mal_id, title: results[0].title }
      }
    } catch {
      continue
    }
  }
  
  return null
}

// Try HiAnime API for HLS streams
async function tryHiAnime(title: string, episode: number): Promise<StreamResponse | null> {
  try {
    console.log("[v0] HiAnime search:", title)
    
    // Search for the anime
    const searchResult = await searchAnime(title)
    
    if (!searchResult.results.length) {
      // Try normalized title
      const normalizedSearch = await searchAnime(normalizeTitle(title))
      if (!normalizedSearch.results.length) {
        console.log("[v0] HiAnime: No results found")
        return null
      }
      searchResult.results = normalizedSearch.results
    }
    
    // Get best match
    const anime = searchResult.results[0]
    console.log("[v0] HiAnime found:", anime.id, anime.name)
    
    // Get episodes
    const episodes = await getEpisodes(anime.id)
    console.log("[v0] HiAnime episodes:", episodes.length)
    
    if (!episodes.length) {
      return null
    }
    
    // Find the requested episode
    const targetEpisode = episodes.find(ep => ep.number === episode) || episodes[0]
    console.log("[v0] HiAnime episode:", targetEpisode.number, targetEpisode.episodeId)
    
    // Get servers
    const servers = await getEpisodeServers(targetEpisode.episodeId)
    console.log("[v0] HiAnime servers - sub:", servers.sub.length, "dub:", servers.dub.length)
    
    // Try each server (prioritize sub)
    const serverList = [...servers.sub, ...servers.dub, ...servers.raw]
    
    for (const server of serverList) {
      try {
        console.log("[v0] HiAnime trying server:", server.serverName, server.serverId)
        
        const streamInfo = await getStreamingSources(
          targetEpisode.episodeId,
          server.serverId,
          server.type
        )
        
        if (streamInfo && streamInfo.sources.length > 0) {
          console.log("[v0] HiAnime stream found:", streamInfo.sources.length, "sources")
          
          // Proxy the HLS URLs
          const proxiedSources = streamInfo.sources.map(source => ({
            ...source,
            url: source.isM3U8 ? proxyUrl(source.url, streamInfo.headers) : source.url,
          }))
          
          return {
            success: true,
            sources: proxiedSources,
            subtitles: streamInfo.subtitles,
            intro: streamInfo.intro,
            outro: streamInfo.outro,
            provider: `HiAnime (${server.serverName})`,
          }
        }
      } catch (err) {
        console.log("[v0] HiAnime server error:", server.serverName, err)
        continue
      }
    }
    
    return null
  } catch (error) {
    console.error("[v0] HiAnime error:", error)
    return null
  }
}

// Try Megaplay iframe as fallback
async function tryMegaplay(title: string, episode: number): Promise<StreamResponse | null> {
  try {
    console.log("[v0] Megaplay fallback for:", title)
    
    // Get MAL ID from Jikan
    const jikanResult = await searchJikan(title)
    
    if (!jikanResult) {
      console.log("[v0] Megaplay: No MAL ID found")
      return null
    }
    
    console.log("[v0] Megaplay MAL ID:", jikanResult.mal_id)
    
    // Generate Megaplay URLs
    const subUrl = `${MEGAPLAY_BASE}/stream/mal/${jikanResult.mal_id}/${episode}/sub`
    const dubUrl = `${MEGAPLAY_BASE}/stream/mal/${jikanResult.mal_id}/${episode}/dub`
    
    return {
      success: true,
      sources: [
        { url: subUrl, quality: "SUB", isM3U8: false, type: "iframe" },
        { url: dubUrl, quality: "DUB", isM3U8: false, type: "iframe" },
      ],
      isIframe: true,
      provider: "Megaplay",
    }
  } catch (error) {
    console.error("[v0] Megaplay error:", error)
    return null
  }
}

export async function GET(request: Request): Promise<NextResponse<StreamResponse>> {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get("title")
  const episodeStr = searchParams.get("episode") || "1"
  const episode = parseInt(episodeStr)
  const preferHls = searchParams.get("preferHls") !== "false"

  if (!title) {
    return NextResponse.json({
      success: false,
      sources: [],
      isDemo: true,
      provider: "Demo",
    })
  }

  console.log("[v0] Stream request:", title, "ep:", episode, "preferHls:", preferHls)

  // Try HiAnime first for HLS streams
  if (preferHls) {
    const hiAnimeResult = await tryHiAnime(title, episode)
    if (hiAnimeResult) {
      return NextResponse.json(hiAnimeResult)
    }
  }

  // Fallback to Megaplay iframe
  const megaplayResult = await tryMegaplay(title, episode)
  if (megaplayResult) {
    return NextResponse.json(megaplayResult)
  }

  // Last resort: demo streams
  console.log("[v0] Using demo streams")
  return NextResponse.json({
    success: true,
    sources: DEMO_STREAMS,
    isDemo: true,
    provider: "Demo",
  })
}
