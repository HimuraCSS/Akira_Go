import { NextResponse } from "next/server"

// Addon API - Returns video sources for a given anime/episode
// Uses multiple API sources for redundancy

interface StreamSource {
  url: string
  quality: string
  isM3U8: boolean
}

interface StreamResponse {
  sources: StreamSource[]
  subtitles?: { url: string; lang: string }[]
}

// Normalize anime title for better search
function normalizeTitle(title: string): string {
  return title
    .replace(/[:\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/Season \d+/gi, "")
    .replace(/\d+(st|nd|rd|th) Season/gi, "")
    .replace(/Part \d+/gi, "")
    .trim()
}

function toSlug(title: string): string {
  return normalizeTitle(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
}

// Demo/Test HLS streams that actually work
const DEMO_STREAMS: StreamSource[] = [
  {
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    quality: "720p",
    isM3U8: true,
  },
  {
    url: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
    quality: "1080p (Sintel)",
    isM3U8: true,
  },
  {
    url: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4",
    quality: "1080p (MP4)",
    isM3U8: false,
  },
]

// Try amvstrm API (usually stable)
async function tryAmvstrmAPI(title: string, episode: number): Promise<StreamResponse | null> {
  try {
    const searchUrl = `https://api.amvstr.me/api/v2/search?q=${encodeURIComponent(title)}&limit=5`
    console.log("[v0] Trying amvstrm:", searchUrl)
    
    const searchRes = await fetch(searchUrl, { 
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    })
    
    if (!searchRes.ok) return null
    
    const searchData = await searchRes.json()
    const results = searchData.results || searchData.data || []
    
    if (results.length === 0) return null
    
    const anime = results[0]
    const animeId = anime.id || anime.slug
    
    // Get episodes
    const infoRes = await fetch(`https://api.amvstr.me/api/v2/info/${animeId}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    })
    
    if (!infoRes.ok) return null
    
    const infoData = await infoRes.json()
    const episodes = infoData.episodes || infoData.data?.episodes || []
    
    if (episodes.length === 0) return null
    
    const ep = episodes.find((e: { number?: number; episode?: number }) => 
      (e.number || e.episode) === episode
    ) || episodes[episode - 1] || episodes[0]
    
    const episodeId = ep.id || ep.episodeId
    
    // Get stream
    const streamRes = await fetch(`https://api.amvstr.me/api/v2/stream/${episodeId}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    })
    
    if (!streamRes.ok) return null
    
    const streamData = await streamRes.json()
    const sources = streamData.sources || streamData.data?.sources || []
    
    if (sources.length > 0) {
      return {
        sources: sources.map((s: { url: string; quality?: string; isM3U8?: boolean }) => ({
          url: s.url,
          quality: s.quality || "auto",
          isM3U8: s.isM3U8 !== false,
        })),
        subtitles: streamData.subtitles || streamData.data?.subtitles || [],
      }
    }
    return null
  } catch (error) {
    console.log("[v0] amvstrm error:", error)
    return null
  }
}

// Try Anify API
async function tryAnifyAPI(title: string, episode: number): Promise<StreamResponse | null> {
  try {
    const searchUrl = `https://api.anify.tv/search/anime/${encodeURIComponent(title)}`
    console.log("[v0] Trying anify:", searchUrl)
    
    const searchRes = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    })
    
    if (!searchRes.ok) return null
    
    const results = await searchRes.json()
    if (!results || results.length === 0) return null
    
    const anime = results[0]
    
    // Get episodes with sources
    const sourcesRes = await fetch(`https://api.anify.tv/sources?providerId=gogoanime&watchId=${anime.id}&episode=${episode}&id=${anime.id}&subType=sub`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    })
    
    if (!sourcesRes.ok) return null
    
    const sourcesData = await sourcesRes.json()
    const sources = sourcesData.sources || []
    
    if (sources.length > 0) {
      return {
        sources: sources.map((s: { url: string; quality?: string }) => ({
          url: s.url,
          quality: s.quality || "auto",
          isM3U8: s.url.includes(".m3u8"),
        })),
        subtitles: sourcesData.subtitles || [],
      }
    }
    return null
  } catch (error) {
    console.log("[v0] anify error:", error)
    return null
  }
}

// Try direct gogoanime format
async function tryDirectGogoanime(title: string, episode: number): Promise<StreamResponse | null> {
  try {
    const slug = toSlug(title)
    const episodeId = `${slug}-episode-${episode}`
    
    // Try multiple gogoanime API mirrors
    const mirrors = [
      `https://gogoanime-api-theta.vercel.app/anime/gogoanime/watch/${episodeId}`,
      `https://api.consumet.org/anime/gogoanime/watch/${episodeId}`,
    ]
    
    for (const url of mirrors) {
      try {
        console.log("[v0] Trying direct gogoanime:", url)
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        })
        
        if (!res.ok) continue
        
        const text = await res.text()
        // Check if response is valid JSON
        if (text.startsWith("require") || text.startsWith("<")) continue
        
        const data = JSON.parse(text)
        if (data.sources && data.sources.length > 0) {
          return {
            sources: data.sources.map((s: { url: string; quality?: string; isM3U8?: boolean }) => ({
              url: s.url,
              quality: s.quality || "auto",
              isM3U8: s.isM3U8 !== false,
            })),
            subtitles: data.subtitles || [],
          }
        }
      } catch {
        continue
      }
    }
    return null
  } catch (error) {
    console.log("[v0] direct gogoanime error:", error)
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const animeTitle = searchParams.get("title")
  const episodeNumber = parseInt(searchParams.get("episode") || "1")
  const provider = searchParams.get("provider") || "gogoanime"
  const useDemo = searchParams.get("demo") === "true"
  
  console.log("[v0] Addon API:", { animeTitle, episodeNumber, provider, useDemo })
  
  if (!animeTitle) {
    return NextResponse.json({ error: "Missing title", sources: [] }, { status: 400 })
  }
  
  // If demo mode requested, return demo streams immediately
  if (useDemo) {
    return NextResponse.json({
      success: true,
      isDemo: true,
      anime: { id: "demo", title: animeTitle },
      episode: { id: "demo", number: episodeNumber },
      sources: DEMO_STREAMS,
      subtitles: [],
      provider: "demo",
    })
  }
  
  try {
    let streamData: StreamResponse | null = null
    
    // Try multiple APIs in parallel for speed
    const results = await Promise.allSettled([
      tryAmvstrmAPI(animeTitle, episodeNumber),
      tryAnifyAPI(animeTitle, episodeNumber),
      tryDirectGogoanime(animeTitle, episodeNumber),
    ])
    
    // Use first successful result
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        streamData = result.value
        break
      }
    }
    
    // Try with normalized title if no results
    if (!streamData) {
      const normalizedTitle = normalizeTitle(animeTitle)
      if (normalizedTitle !== animeTitle) {
        console.log("[v0] Trying normalized:", normalizedTitle)
        streamData = await tryAmvstrmAPI(normalizedTitle, episodeNumber)
      }
    }
    
    // Return demo streams as fallback with flag
    if (!streamData) {
      console.log("[v0] No sources found, returning demo streams")
      return NextResponse.json({
        success: true,
        isDemo: true,
        anime: { id: toSlug(animeTitle), title: animeTitle },
        episode: { id: `ep-${episodeNumber}`, number: episodeNumber },
        sources: DEMO_STREAMS,
        subtitles: [],
        provider: "demo",
        message: "Fontes reais indisponíveis. Usando vídeo de demonstração.",
      })
    }
    
    console.log("[v0] Found", streamData.sources.length, "sources")
    return NextResponse.json({
      success: true,
      anime: { id: toSlug(animeTitle), title: animeTitle },
      episode: { id: `ep-${episodeNumber}`, number: episodeNumber },
      sources: streamData.sources,
      subtitles: streamData.subtitles,
      provider,
    })
  } catch (error) {
    console.error("[v0] Addon API error:", error)
    // Return demo streams on error
    return NextResponse.json({
      success: true,
      isDemo: true,
      anime: { id: toSlug(animeTitle), title: animeTitle },
      episode: { id: `ep-${episodeNumber}`, number: episodeNumber },
      sources: DEMO_STREAMS,
      subtitles: [],
      provider: "demo",
      message: "Erro ao buscar fontes. Usando vídeo de demonstração.",
    })
  }
}
