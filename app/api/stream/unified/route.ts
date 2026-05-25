import { NextResponse } from "next/server"
import { 
  searchAnime as searchHiAnime, 
  getEpisodes, 
  getEpisodeServers,
  getStreamingSources,
  type StreamInfo,
  type Server,
} from "@/lib/hianime/scraper"
import { BR_ANIME_PROVIDERS, generateEmbedUrl } from "@/lib/br-anime-providers"

// Types
interface UnifiedSource {
  id: string
  name: string
  quality: string
  url: string
  isM3U8: boolean
  type: "iframe" | "hls" | "mp4"
  provider: string
  hasSubtitles: boolean
  subtitleLanguages?: string[]
}

interface UnifiedSubtitle {
  url: string
  lang: string
  label: string
  isPTBR: boolean
}

interface UnifiedStreamResponse {
  sources: UnifiedSource[]
  subtitles: UnifiedSubtitle[]
  intro?: { start: number; end: number }
  outro?: { start: number; end: number }
  recommendedSource?: UnifiedSource
}

// Get iframe sources from BR providers
function getIframeSources(
  malId: number, 
  anilistId: number | undefined, 
  episode: number,
  animeSlug?: string
): UnifiedSource[] {
  const sources: UnifiedSource[] = []
  
  // Get top iframe providers (increased to 10 for more options)
  const iframeProviders = BR_ANIME_PROVIDERS
    .filter(p => p.status === "online" && p.type === "iframe")
    .slice(0, 10) // Top 10 iframe providers
  
  for (const provider of iframeProviders) {
    // generateEmbedUrl expects providerId as first param
    const url = generateEmbedUrl(provider.id, {
      malId,
      anilistId: anilistId || malId, // Fallback to malId
      episode,
      slug: animeSlug,
    })
    
    if (url) {
      sources.push({
        id: `iframe-${provider.id}`,
        name: provider.name,
        quality: provider.quality || "FHD",
        url,
        isM3U8: false,
        type: "iframe",
        provider: provider.id,
        hasSubtitles: provider.hasSub,
        subtitleLanguages: provider.languages,
      })
    }
  }
  
  return sources
}

// Search and get HiAnime episode info
async function getHiAnimeEpisodeInfo(
  animeTitle: string, 
  episodeNumber: number
): Promise<{ episodeId: string; animeId: string } | null> {
  try {
    // Search for anime
    const searchResults = await searchHiAnime(animeTitle)
    
    if (!searchResults.results.length) {
      // Try simplified search (remove special characters and season info)
      const simplifiedTitle = animeTitle
        .replace(/\s*(Season\s*\d+|Part\s*\d+|2nd|3rd|\d+th)\s*/gi, " ")
        .replace(/[^\w\s]/g, " ")
        .trim()
      
      const retryResults = await searchHiAnime(simplifiedTitle)
      if (!retryResults.results.length) {
        return null
      }
      searchResults.results = retryResults.results
    }
    
    // Find best match
    const anime = searchResults.results[0]
    
    // Get episodes
    const episodes = await getEpisodes(anime.id)
    const episode = episodes.find(ep => ep.number === episodeNumber)
    
    if (!episode) {
      return null
    }
    
    return {
      episodeId: episode.episodeId,
      animeId: anime.id,
    }
  } catch (error) {
    console.error("[UnifiedStream] HiAnime search error:", error)
    return null
  }
}

// Get HLS sources with subtitles from HiAnime
async function getHLSSources(
  episodeId: string,
  animeTitle: string
): Promise<{
  sources: UnifiedSource[]
  subtitles: UnifiedSubtitle[]
  intro?: { start: number; end: number }
  outro?: { start: number; end: number }
}> {
  const result = {
    sources: [] as UnifiedSource[],
    subtitles: [] as UnifiedSubtitle[],
    intro: undefined as { start: number; end: number } | undefined,
    outro: undefined as { start: number; end: number } | undefined,
  }
  
  try {
    // Get available servers
    const servers = await getEpisodeServers(episodeId)
    
    // Try each server type (prefer sub for subtitles)
    const serverOrder: Array<{ servers: Server[]; type: string }> = [
      { servers: servers.sub, type: "sub" },
      { servers: servers.dub, type: "dub" },
      { servers: servers.raw, type: "raw" },
    ]
    
    for (const { servers: serverList, type } of serverOrder) {
      for (const server of serverList.slice(0, 3)) { // Limit to 3 servers per type
        try {
          const streamInfo = await getStreamingSources(
            episodeId,
            server.serverId,
            type as "sub" | "dub" | "raw"
          )
          
          if (streamInfo && streamInfo.sources.length > 0) {
            // Add sources
            for (const source of streamInfo.sources) {
              result.sources.push({
                id: `hls-${server.serverName}-${source.quality}`,
                name: `${server.serverName} (${type.toUpperCase()})`,
                quality: source.quality,
                url: source.url,
                isM3U8: source.isM3U8,
                type: source.isM3U8 ? "hls" : "mp4",
                provider: "hianime",
                hasSubtitles: streamInfo.subtitles.length > 0,
                subtitleLanguages: streamInfo.subtitles.map(s => s.lang),
              })
            }
            
            // Add subtitles (merge unique)
            for (const sub of streamInfo.subtitles) {
              const exists = result.subtitles.some(s => s.url === sub.url)
              if (!exists) {
                const isPTBR = /portugu[eê]s|portuguese|pt-br|pt_br|brazil/i.test(sub.lang)
                result.subtitles.push({
                  url: sub.url,
                  lang: sub.lang,
                  label: sub.lang,
                  isPTBR,
                })
              }
            }
            
            // Set intro/outro from first successful source
            if (!result.intro && streamInfo.intro) {
              result.intro = streamInfo.intro
            }
            if (!result.outro && streamInfo.outro) {
              result.outro = streamInfo.outro
            }
          }
        } catch (e) {
          console.log(`[UnifiedStream] Server ${server.serverName} failed:`, e)
          continue
        }
      }
    }
  } catch (error) {
    console.error("[UnifiedStream] HLS sources error:", error)
  }
  
  return result
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  // Required params
  const malId = parseInt(searchParams.get("malId") || "0")
  const episode = parseInt(searchParams.get("episode") || "1")
  const title = searchParams.get("title") || ""
  
  // Optional params
  const anilistId = searchParams.get("anilistId") 
    ? parseInt(searchParams.get("anilistId")!) 
    : undefined
  const slug = searchParams.get("slug") || undefined
  const preferIframe = searchParams.get("preferIframe") === "true"
  
  if (!malId && !title) {
    return NextResponse.json(
      { success: false, error: "malId or title is required" },
      { status: 400 }
    )
  }

  try {
    const response: UnifiedStreamResponse = {
      sources: [],
      subtitles: [],
    }
    
    // 1. Get iframe sources (fast, always available)
    if (malId) {
      const iframeSources = getIframeSources(malId, anilistId, episode, slug)
      response.sources.push(...iframeSources)
    }
    
    // 2. Get HLS sources with subtitles (requires search, but has PT-BR subs)
    if (title) {
      const hiAnimeInfo = await getHiAnimeEpisodeInfo(title, episode)
      
      if (hiAnimeInfo) {
        const hlsResult = await getHLSSources(hiAnimeInfo.episodeId, title)
        
        response.sources.push(...hlsResult.sources)
        response.subtitles.push(...hlsResult.subtitles)
        response.intro = hlsResult.intro
        response.outro = hlsResult.outro
      }
    }
    
    // 3. Sort subtitles - PT-BR first
    response.subtitles.sort((a, b) => {
      if (a.isPTBR && !b.isPTBR) return -1
      if (!a.isPTBR && b.isPTBR) return 1
      return a.lang.localeCompare(b.lang)
    })
    
    // 4. Determine recommended source
    if (response.sources.length > 0) {
      if (preferIframe) {
        // Prefer iframe (Megaplay)
        response.recommendedSource = response.sources.find(s => s.type === "iframe")
          || response.sources[0]
      } else {
        // Prefer HLS with subtitles
        response.recommendedSource = response.sources.find(s => 
          s.type === "hls" && s.hasSubtitles
        ) || response.sources.find(s => s.type === "hls")
          || response.sources[0]
      }
    }
    
    return NextResponse.json({
      success: true,
      data: response,
      meta: {
        totalSources: response.sources.length,
        totalSubtitles: response.subtitles.length,
        hasPTBR: response.subtitles.some(s => s.isPTBR),
        hasIframe: response.sources.some(s => s.type === "iframe"),
        hasHLS: response.sources.some(s => s.type === "hls"),
      }
    })
  } catch (error) {
    console.error("[UnifiedStream] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch streaming sources" },
      { status: 500 }
    )
  }
}
