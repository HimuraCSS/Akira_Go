import { NextResponse } from "next/server"

// AniWatch API (public instance)
const ANIWATCH_API = "https://api-aniwatch.onrender.com"

// Jikan API for anime metadata (MyAnimeList) - fallback
const JIKAN_BASE = "https://api.jikan.moe/v4"

// Megaplay embed URL format (final fallback)
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

// Demo streams as last fallback
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

// Try AniWatch API for HLS streams (primary source)
async function tryAniWatch(title: string, episode: number): Promise<StreamResponse | null> {
  try {
    console.log("[v0] AniWatch search:", title)
    
    // Search for anime
    const searchUrl = `${ANIWATCH_API}/api/v2/hianime/search?q=${encodeURIComponent(title)}`
    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    })
    
    if (!searchRes.ok) {
      console.log("[v0] AniWatch search failed:", searchRes.status)
      return null
    }
    
    const searchData = await searchRes.json()
    const animes = searchData.data?.animes || []
    
    if (!animes.length) {
      // Try normalized title
      const normalizedUrl = `${ANIWATCH_API}/api/v2/hianime/search?q=${encodeURIComponent(normalizeTitle(title))}`
      const normalizedRes = await fetch(normalizedUrl, {
        signal: AbortSignal.timeout(10000),
        headers: { Accept: "application/json" },
      })
      
      if (normalizedRes.ok) {
        const normalizedData = await normalizedRes.json()
        if (normalizedData.data?.animes?.length) {
          animes.push(...normalizedData.data.animes)
        }
      }
    }
    
    if (!animes.length) {
      console.log("[v0] AniWatch: No results found")
      return null
    }
    
    // Get best match
    const anime = animes[0]
    console.log("[v0] AniWatch found:", anime.id, anime.name)
    
    // Get episodes
    const episodesUrl = `${ANIWATCH_API}/api/v2/hianime/anime/${anime.id}/episodes`
    const episodesRes = await fetch(episodesUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    })
    
    if (!episodesRes.ok) {
      console.log("[v0] AniWatch episodes failed:", episodesRes.status)
      return null
    }
    
    const episodesData = await episodesRes.json()
    const episodes = episodesData.data?.episodes || []
    
    if (!episodes.length) {
      console.log("[v0] AniWatch: No episodes found")
      return null
    }
    
    console.log("[v0] AniWatch episodes:", episodes.length)
    
    // Find the requested episode
    const targetEpisode = episodes.find((ep: { number: number }) => ep.number === episode) || episodes[0]
    console.log("[v0] AniWatch episode:", targetEpisode.number, targetEpisode.episodeId)
    
    // Get episode servers
    const serversUrl = `${ANIWATCH_API}/api/v2/hianime/episode/servers?animeEpisodeId=${targetEpisode.episodeId}`
    const serversRes = await fetch(serversUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: "application/json" },
    })
    
    if (!serversRes.ok) {
      console.log("[v0] AniWatch servers failed:", serversRes.status)
      return null
    }
    
    const serversData = await serversRes.json()
    const subServers = serversData.data?.sub || []
    const dubServers = serversData.data?.dub || []
    const allServers = [...subServers, ...dubServers]
    
    console.log("[v0] AniWatch servers - sub:", subServers.length, "dub:", dubServers.length)
    
    // Try servers (prioritize HD-1, HD-2)
    const serverPriority = ["hd-1", "hd-2", "megacloud", "streamsb", "vidstreaming"]
    const sortedServers = allServers.sort((a: { serverName: string }, b: { serverName: string }) => {
      const aIdx = serverPriority.indexOf(a.serverName.toLowerCase())
      const bIdx = serverPriority.indexOf(b.serverName.toLowerCase())
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
    })
    
    for (const server of sortedServers) {
      try {
        const category = subServers.includes(server) ? "sub" : "dub"
        const sourcesUrl = `${ANIWATCH_API}/api/v2/hianime/episode/sources?animeEpisodeId=${targetEpisode.episodeId}&server=${server.serverName}&category=${category}`
        
        console.log("[v0] AniWatch trying:", server.serverName, category)
        
        const sourcesRes = await fetch(sourcesUrl, {
          signal: AbortSignal.timeout(15000),
          headers: { Accept: "application/json" },
        })
        
        if (!sourcesRes.ok) continue
        
        const sourcesData = await sourcesRes.json()
        const sources = sourcesData.data?.sources || []
        const tracks = sourcesData.data?.tracks || []
        const intro = sourcesData.data?.intro
        const outro = sourcesData.data?.outro
        
        if (sources.length > 0) {
          console.log("[v0] AniWatch stream found:", sources.length, "sources")
          
          // Process sources - proxy through our M3U8 proxy
          const processedSources: StreamSource[] = sources.map((source: { url: string; quality?: string; type?: string }) => ({
            url: proxyUrl(source.url),
            quality: source.quality || "Auto",
            isM3U8: source.url.includes(".m3u8"),
            type: "hls",
          }))
          
          // Process subtitles
          const subtitles = tracks
            .filter((t: { kind: string }) => t.kind === "captions")
            .map((t: { file: string; label: string }) => ({
              url: t.file,
              lang: t.label || "Unknown",
            }))
          
          return {
            success: true,
            sources: processedSources,
            subtitles,
            intro: intro ? { start: intro.start || 0, end: intro.end || 0 } : undefined,
            outro: outro ? { start: outro.start || 0, end: outro.end || 0 } : undefined,
            provider: `AniWatch (${server.serverName})`,
          }
        }
      } catch (err) {
        console.log("[v0] AniWatch server error:", server.serverName, err)
        continue
      }
    }
    
    return null
  } catch (error) {
    console.error("[v0] AniWatch error:", error)
    return null
  }
}

// Search Jikan for MAL ID (for Megaplay fallback)
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
      
      if (results.length > 0) {
        return { mal_id: results[0].mal_id, title: results[0].title }
      }
    } catch {
      continue
    }
  }
  
  return null
}

// Try Megaplay iframe as fallback
async function tryMegaplay(title: string, episode: number): Promise<StreamResponse | null> {
  try {
    console.log("[v0] Megaplay fallback for:", title)
    
    const jikanResult = await searchJikan(title)
    
    if (!jikanResult) {
      console.log("[v0] Megaplay: No MAL ID found")
      return null
    }
    
    console.log("[v0] Megaplay MAL ID:", jikanResult.mal_id)
    
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

  // Try AniWatch API first for HLS streams
  if (preferHls) {
    const aniWatchResult = await tryAniWatch(title, episode)
    if (aniWatchResult) {
      return NextResponse.json(aniWatchResult)
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
