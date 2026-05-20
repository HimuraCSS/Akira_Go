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

// Generate alternative title variations for better matching
function getTitleVariations(title: string): string[] {
  const variations: string[] = [title]
  
  // Common title transformations
  const normalized = normalizeTitle(title)
  if (normalized !== title.toLowerCase()) {
    variations.push(normalized)
  }
  
  // Remove "no" for Japanese titles (e.g., "Tongari Boushi no Atelier" -> "Tongari Boushi Atelier")
  if (title.includes(" no ")) {
    variations.push(title.replace(/ no /gi, " "))
  }
  
  // Common romanization variations
  const romanized = title
    .replace(/ou/g, "o")
    .replace(/uu/g, "u")
  if (romanized !== title) {
    variations.push(romanized)
  }
  
  // First few words only (for long titles)
  const words = title.split(" ")
  if (words.length > 3) {
    variations.push(words.slice(0, 3).join(" "))
    variations.push(words.slice(0, 2).join(" "))
  }
  
  // Remove common suffixes
  const withoutSuffix = title
    .replace(/\s*(Part|Cour|Season|Arc)\s*\d*/gi, "")
    .trim()
  if (withoutSuffix !== title && withoutSuffix.length > 3) {
    variations.push(withoutSuffix)
  }
  
  return Array.from(new Set(variations))
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

// Try Consumet Zoro/Aniwatch API (more reliable than GogoAnime)
async function tryConsumetZoro(title: string, episode: number): Promise<StreamResponse | null> {
  try {
    const consumetApis = [
      "https://api.consumet.org",
      "https://consumet-api.vercel.app",
    ]
    
    const titleVariations = getTitleVariations(title)
    console.log("[v0] Consumet Zoro searching with variations:", titleVariations.slice(0, 3))
    
    for (const baseUrl of consumetApis) {
      for (const searchTitle of titleVariations) {
        try {
          // Search for anime on Zoro
          const searchRes = await fetch(
            `${baseUrl}/anime/zoro/${encodeURIComponent(searchTitle)}`,
            { signal: AbortSignal.timeout(8000) }
          )
          
          if (!searchRes.ok) continue
          
          const searchData = await searchRes.json()
          const results = searchData.results || []
          
          if (!results.length) continue
          
          const anime = results[0]
          console.log("[v0] Consumet Zoro found:", anime.id, "for:", searchTitle)
        
        // Get anime info with episodes
        const infoRes = await fetch(
          `${baseUrl}/anime/zoro/info?id=${anime.id}`,
          { signal: AbortSignal.timeout(8000) }
        )
        
        if (!infoRes.ok) continue
        
        const infoData = await infoRes.json()
        const episodes = infoData.episodes || []
        
        const targetEp = episodes.find((ep: { number: number }) => ep.number === episode)
        if (!targetEp) continue
        
        console.log("[v0] Consumet Zoro episode:", targetEp.id)
        
        // Get stream sources (sub by default)
        const watchRes = await fetch(
          `${baseUrl}/anime/zoro/watch?episodeId=${targetEp.id}`,
          { signal: AbortSignal.timeout(10000) }
        )
        
        if (!watchRes.ok) continue
        
        const watchData = await watchRes.json()
        const sources = watchData.sources || []
        
        if (sources.length > 0) {
          console.log("[v0] Consumet Zoro stream found:", sources.length, "sources")
          
          // Validate first source is accessible
          const firstSource = sources[0]
          try {
            const validateRes = await fetch(firstSource.url, { 
              method: 'HEAD',
              signal: AbortSignal.timeout(5000)
            })
            if (!validateRes.ok && validateRes.status !== 200 && validateRes.status !== 206) {
              console.log("[v0] Stream validation failed:", validateRes.status)
              continue
            }
          } catch {
            // If HEAD fails, try anyway - some servers don't support HEAD
          }
          
          return {
            success: true,
            sources: sources.map((s: { url: string; quality?: string; isM3U8?: boolean }) => ({
              url: proxyUrl(s.url),
              quality: s.quality || "Auto",
              isM3U8: s.isM3U8 !== false,
              type: "hls",
            })),
            subtitles: watchData.subtitles?.map((sub: { url: string; lang: string }) => ({
              url: sub.url,
              lang: sub.lang,
            })) || [],
            provider: "Zoro",
          }
        }
        } catch (err) {
          console.log("[v0] Consumet Zoro API error:", err)
          continue
        }
      }
    }
    
    return null
  } catch (error) {
    console.error("[v0] Consumet Zoro error:", error)
    return null
  }
}

// Try Consumet GogoAnime API
async function tryConsumetGogo(title: string, episode: number): Promise<StreamResponse | null> {
  try {
    const consumetApis = [
      "https://api.consumet.org",
      "https://consumet-api.vercel.app",
    ]
    
    const titleVariations = getTitleVariations(title)
    console.log("[v0] Consumet Gogo searching with variations:", titleVariations.slice(0, 3))
    
    for (const baseUrl of consumetApis) {
      for (const searchTitle of titleVariations) {
        try {
          // Search for anime
          const searchRes = await fetch(
            `${baseUrl}/anime/gogoanime/${encodeURIComponent(searchTitle)}`,
            { signal: AbortSignal.timeout(8000) }
          )
          
          if (!searchRes.ok) continue
          
          const searchData = await searchRes.json()
          const results = searchData.results || []
          
          if (!results.length) continue
          
          const anime = results[0]
          console.log("[v0] Consumet Gogo found:", anime.id, "for:", searchTitle)
        
        // Get anime info with episodes
        const infoRes = await fetch(
          `${baseUrl}/anime/gogoanime/info/${anime.id}`,
          { signal: AbortSignal.timeout(8000) }
        )
        
        if (!infoRes.ok) continue
        
        const infoData = await infoRes.json()
        const episodes = infoData.episodes || []
        
        const targetEp = episodes.find((ep: { number: number }) => ep.number === episode)
        if (!targetEp) continue
        
        console.log("[v0] Consumet episode:", targetEp.id)
        
        // Get stream sources
        const watchRes = await fetch(
          `${baseUrl}/anime/gogoanime/watch/${targetEp.id}`,
          { signal: AbortSignal.timeout(10000) }
        )
        
        if (!watchRes.ok) continue
        
        const watchData = await watchRes.json()
        const sources = watchData.sources || []
        
        if (sources.length > 0) {
          console.log("[v0] Consumet Gogo stream found:", sources.length, "sources")
          
          return {
            success: true,
            sources: sources.map((s: { url: string; quality?: string; isM3U8?: boolean }) => ({
              url: proxyUrl(s.url),
              quality: s.quality || "Auto",
              isM3U8: s.isM3U8 !== false,
              type: "hls",
            })),
            provider: "GogoAnime",
          }
        }
        } catch (err) {
          console.log("[v0] Consumet Gogo API error:", err)
          continue
        }
      }
    }
    
    return null
  } catch (error) {
    console.error("[v0] Consumet Gogo error:", error)
    return null
  }
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

  // Try Megaplay iframe first (most reliable for recent anime)
  const megaplayResult = await tryMegaplay(title, episode)
  if (megaplayResult) {
    return NextResponse.json(megaplayResult)
  }

  // Try AniWatch API for HLS streams
  if (preferHls) {
    const aniWatchResult = await tryAniWatch(title, episode)
    if (aniWatchResult) {
      return NextResponse.json(aniWatchResult)
    }
  }

  // Try Consumet Zoro as fallback
  const zoroResult = await tryConsumetZoro(title, episode)
  if (zoroResult) {
    return NextResponse.json(zoroResult)
  }

  // Try Consumet GogoAnime as last resort
  const gogoResult = await tryConsumetGogo(title, episode)
  if (gogoResult) {
    return NextResponse.json(gogoResult)
  }

  // Return error - no valid streams found
  console.log("[v0] No streams found for:", title)
  return NextResponse.json({
    success: false,
    sources: [],
    error: `Nenhuma fonte encontrada para "${title}" episodio ${episode}. Este anime pode ser muito novo ou nao estar disponivel nas fontes publicas.`,
    provider: "None",
  } as StreamResponse & { error: string }, { status: 404 })
}
