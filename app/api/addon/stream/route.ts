import { NextResponse } from "next/server"

// Addon API - Returns video sources for a given anime/episode
// Uses Consumet mirrors and direct GogoAnime scraping for redundancy

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

// List of Consumet mirrors to try
const CONSUMET_MIRRORS = [
  "https://consumet-api-five-chi.vercel.app",
  "https://consumet-api-cyan.vercel.app", 
  "https://consumet-api-pi.vercel.app",
  "https://consumet-api-omega.vercel.app",
  "https://consumet-api-sigma.vercel.app",
]

// Try Consumet mirrors
async function tryConsumetMirrors(
  title: string, 
  episode: number, 
  provider: string = "gogoanime"
): Promise<StreamResponse | null> {
  const searchTerms = [
    title,
    normalizeTitle(title),
    title.split(":")[0].trim(),
  ]
  
  for (const mirror of CONSUMET_MIRRORS) {
    for (const term of searchTerms) {
      try {
        // Search for anime
        const searchUrl = `${mirror}/anime/${provider}/${encodeURIComponent(term)}`
        console.log("[v0] Trying Consumet mirror:", searchUrl)
        
        const searchRes = await fetch(searchUrl, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        })
        
        if (!searchRes.ok) continue
        
        const text = await searchRes.text()
        if (!text.startsWith("{") && !text.startsWith("[")) continue
        
        const searchData = JSON.parse(text)
        const results = searchData.results || []
        
        if (results.length === 0) continue
        
        // Find best match
        const lowerTitle = title.toLowerCase()
        const anime = results.find((r: { title: string }) => 
          r.title.toLowerCase().includes(lowerTitle.split(" ")[0].toLowerCase())
        ) || results[0]
        
        // Get anime info with episodes
        const infoUrl = `${mirror}/anime/${provider}/info/${anime.id}`
        console.log("[v0] Getting anime info:", infoUrl)
        
        const infoRes = await fetch(infoUrl, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        })
        
        if (!infoRes.ok) continue
        
        const infoText = await infoRes.text()
        if (!infoText.startsWith("{")) continue
        
        const infoData = JSON.parse(infoText)
        const episodes = infoData.episodes || []
        
        if (episodes.length === 0) continue
        
        // Find the requested episode
        const ep = episodes.find((e: { number: number }) => e.number === episode) || episodes[0]
        
        // Get streaming sources
        const watchUrl = `${mirror}/anime/${provider}/watch/${ep.id}`
        console.log("[v0] Getting sources:", watchUrl)
        
        const watchRes = await fetch(watchUrl, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        })
        
        if (!watchRes.ok) continue
        
        const watchText = await watchRes.text()
        if (!watchText.startsWith("{")) continue
        
        const watchData = JSON.parse(watchText)
        const sources = watchData.sources || []
        
        if (sources.length > 0) {
          console.log("[v0] Found sources from mirror:", mirror)
          return {
            sources: sources.map((s: { url: string; quality?: string; isM3U8?: boolean }) => ({
              url: s.url,
              quality: s.quality || "default",
              isM3U8: s.isM3U8 !== false,
            })),
            subtitles: watchData.subtitles,
          }
        }
      } catch (error) {
        console.log("[v0] Mirror error:", mirror, error instanceof Error ? error.message : "Unknown")
        continue
      }
    }
  }
  
  return null
}

// Try direct episode URL construction (works for some providers)
async function tryDirectEpisodeUrl(title: string, episode: number): Promise<StreamResponse | null> {
  const slug = toSlug(title)
  const episodeId = `${slug}-episode-${episode}`
  
  for (const mirror of CONSUMET_MIRRORS.slice(0, 3)) {
    try {
      const watchUrl = `${mirror}/anime/gogoanime/watch/${episodeId}`
      console.log("[v0] Trying direct URL:", watchUrl)
      
      const res = await fetch(watchUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      })
      
      if (!res.ok) continue
      
      const text = await res.text()
      if (!text.startsWith("{")) continue
      
      const data = JSON.parse(text)
      
      if (data.sources && data.sources.length > 0) {
        console.log("[v0] Direct URL worked!")
        return {
          sources: data.sources.map((s: { url: string; quality?: string; isM3U8?: boolean }) => ({
            url: s.url,
            quality: s.quality || "default",
            isM3U8: s.isM3U8 !== false,
          })),
          subtitles: data.subtitles,
        }
      }
    } catch {
      continue
    }
  }
  
  return null
}

// Try Zoro/Aniwatch provider (has subtitles)
async function tryZoroProvider(title: string, episode: number): Promise<StreamResponse | null> {
  for (const mirror of CONSUMET_MIRRORS.slice(0, 2)) {
    try {
      // Search in zoro
      const searchUrl = `${mirror}/anime/zoro/${encodeURIComponent(title)}`
      console.log("[v0] Trying Zoro provider:", searchUrl)
      
      const searchRes = await fetch(searchUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      })
      
      if (!searchRes.ok) continue
      
      const text = await searchRes.text()
      if (!text.startsWith("{")) continue
      
      const searchData = JSON.parse(text)
      const results = searchData.results || []
      
      if (results.length === 0) continue
      
      const anime = results[0]
      
      // Get info
      const infoRes = await fetch(`${mirror}/anime/zoro/info?id=${anime.id}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      })
      
      if (!infoRes.ok) continue
      
      const infoText = await infoRes.text()
      if (!infoText.startsWith("{")) continue
      
      const infoData = JSON.parse(infoText)
      const episodes = infoData.episodes || []
      
      if (episodes.length === 0) continue
      
      const ep = episodes.find((e: { number: number }) => e.number === episode) || episodes[0]
      
      // Get sources with vidcloud server (better quality)
      const watchRes = await fetch(`${mirror}/anime/zoro/watch?episodeId=${ep.id}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      })
      
      if (!watchRes.ok) continue
      
      const watchText = await watchRes.text()
      if (!watchText.startsWith("{")) continue
      
      const watchData = JSON.parse(watchText)
      
      if (watchData.sources && watchData.sources.length > 0) {
        console.log("[v0] Zoro sources found!")
        return {
          sources: watchData.sources.map((s: { url: string; quality?: string; isM3U8?: boolean }) => ({
            url: s.url,
            quality: s.quality || "default",
            isM3U8: s.isM3U8 !== false,
          })),
          subtitles: watchData.subtitles,
        }
      }
    } catch (error) {
      console.log("[v0] Zoro error:", error instanceof Error ? error.message : "Unknown")
      continue
    }
  }
  
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const animeTitle = searchParams.get("title")
  const episodeNumber = parseInt(searchParams.get("episode") || "1")
  const provider = searchParams.get("provider") || "gogoanime"
  const useDemo = searchParams.get("demo") === "true"

  console.log("[v0] Addon API request:", { animeTitle, episodeNumber, provider })

  if (!animeTitle) {
    return NextResponse.json(
      { error: "Missing anime title", sources: [] },
      { status: 400 }
    )
  }

  // If explicitly requesting demo
  if (useDemo) {
    return NextResponse.json({
      success: true,
      isDemo: true,
      sources: DEMO_STREAMS,
      subtitles: [],
      message: "Demo streams loaded",
    })
  }

  try {
    // Try providers in order of reliability
    let streamData: StreamResponse | null = null
    
    // 1. Try Consumet mirrors with gogoanime
    streamData = await tryConsumetMirrors(animeTitle, episodeNumber, "gogoanime")
    
    // 2. Try direct URL construction
    if (!streamData) {
      streamData = await tryDirectEpisodeUrl(animeTitle, episodeNumber)
    }
    
    // 3. Try Zoro provider (has subtitles)
    if (!streamData) {
      streamData = await tryZoroProvider(animeTitle, episodeNumber)
    }
    
    // Return results or demo fallback
    if (streamData && streamData.sources.length > 0) {
      return NextResponse.json({
        success: true,
        isDemo: false,
        anime: { title: animeTitle },
        episode: { number: episodeNumber },
        sources: streamData.sources,
        subtitles: streamData.subtitles || [],
        provider,
      })
    }
    
    // Fallback to demo streams
    console.log("[v0] No sources found, returning demo streams")
    return NextResponse.json({
      success: true,
      isDemo: true,
      anime: { title: animeTitle },
      episode: { number: episodeNumber },
      sources: DEMO_STREAMS,
      subtitles: [],
      message: "Using demo streams - real sources unavailable",
    })
  } catch (error) {
    console.error("[v0] Addon API error:", error)
    return NextResponse.json({
      success: true,
      isDemo: true,
      error: "API error, using demo",
      sources: DEMO_STREAMS,
      subtitles: [],
    })
  }
}
