import { NextResponse } from "next/server"

// AniPub API - Free, no auth, CORS enabled
const ANIPUB_BASE = "https://anipub.xyz"

interface StreamSource {
  url: string
  quality: string
  isM3U8: boolean
  type?: string
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

// Search anime in AniPub
async function searchAniPub(title: string): Promise<{ id: number; name: string; epCount: number } | null> {
  const searchTerms = [
    title,
    normalizeTitle(title),
    title.split(":")[0].trim(),
    title.split(" ").slice(0, 2).join(" "),
  ]
  
  for (const term of searchTerms) {
    try {
      // First try exact find
      const findUrl = `${ANIPUB_BASE}/api/find/${encodeURIComponent(term)}`
      console.log("[v0] AniPub find:", findUrl)
      
      const findRes = await fetch(findUrl, {
        signal: AbortSignal.timeout(5000),
      })
      
      if (findRes.ok) {
        const findData = await findRes.json()
        if (findData.exist && findData.id) {
          console.log("[v0] AniPub found:", findData)
          return { id: findData.id, name: term, epCount: findData.ep || 0 }
        }
      }
      
      // Try search endpoint
      const searchUrl = `${ANIPUB_BASE}/api/search/${encodeURIComponent(term)}`
      console.log("[v0] AniPub search:", searchUrl)
      
      const searchRes = await fetch(searchUrl, {
        signal: AbortSignal.timeout(5000),
      })
      
      if (searchRes.ok) {
        const results = await searchRes.json()
        if (Array.isArray(results) && results.length > 0) {
          const match = results[0]
          console.log("[v0] AniPub search result:", match.Name)
          return { id: match._id, name: match.Name, epCount: match.epCount || 0 }
        }
      }
    } catch (error) {
      console.log("[v0] AniPub error:", error)
      continue
    }
  }
  
  return null
}

// Get streaming links from AniPub
async function getAniPubStreams(animeId: number, episodeNumber: number): Promise<{ iframeUrl: string } | null> {
  try {
    const url = `${ANIPUB_BASE}/v1/api/details/${animeId}`
    console.log("[v0] AniPub details:", url)
    
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    })
    
    if (!res.ok) {
      console.log("[v0] AniPub details failed:", res.status)
      return null
    }
    
    const data = await res.json()
    
    if (!data.local) {
      console.log("[v0] AniPub no local data")
      return null
    }
    
    // Episode 1 is in local.link, Episode 2+ is in local.ep array
    let iframeUrl: string | null = null
    
    if (episodeNumber === 1 && data.local.link) {
      // Episode 1 is the top-level link
      iframeUrl = data.local.link.replace("src=", "")
    } else if (data.local.ep && Array.isArray(data.local.ep)) {
      // Episode 2+ is in the ep array (index 0 = ep 2, index 1 = ep 3, etc.)
      const epIndex = episodeNumber - 2
      if (epIndex >= 0 && epIndex < data.local.ep.length && data.local.ep[epIndex]?.link) {
        iframeUrl = data.local.ep[epIndex].link.replace("src=", "")
      }
    }
    
    if (!iframeUrl) {
      console.log("[v0] AniPub no iframe URL for episode", episodeNumber)
      return null
    }
    
    console.log("[v0] AniPub iframe URL:", iframeUrl)
    return { iframeUrl }
  } catch (error) {
    console.log("[v0] AniPub streams error:", error)
    return null
  }
}

// Extract direct video URL from iframe page
async function extractDirectUrl(iframeUrl: string): Promise<string | null> {
  try {
    // If already a direct URL, return it
    if (iframeUrl.includes(".m3u8") || iframeUrl.includes(".mp4")) {
      return iframeUrl
    }
    
    // Try to fetch and extract
    const res = await fetch(iframeUrl, {
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })
    
    if (!res.ok) return null
    
    const html = await res.text()
    
    // Look for .m3u8 URLs
    const m3u8Match = html.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i)
    if (m3u8Match) {
      console.log("[v0] Extracted m3u8:", m3u8Match[0])
      return m3u8Match[0]
    }
    
    // Look for mp4 URLs
    const mp4Match = html.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/i)
    if (mp4Match) {
      console.log("[v0] Extracted mp4:", mp4Match[0])
      return mp4Match[0]
    }
    
    return null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const animeTitle = searchParams.get("title")
  const episodeNumber = parseInt(searchParams.get("episode") || "1")
  
  console.log("[v0] Addon API request:", { animeTitle, episodeNumber })
  
  if (!animeTitle) {
    return NextResponse.json({
      success: true,
      sources: DEMO_STREAMS,
      isDemo: true,
      error: "Missing anime title",
    })
  }
  
  try {
    // Step 1: Search AniPub
    console.log("[v0] Searching AniPub for:", animeTitle)
    const anime = await searchAniPub(animeTitle)
    
    if (anime) {
      // Step 2: Get streaming links
      console.log("[v0] Getting streams for ID:", anime.id)
      const streams = await getAniPubStreams(anime.id, episodeNumber)
      
      if (streams?.iframeUrl) {
        // Step 3: Try to extract direct URL
        const directUrl = await extractDirectUrl(streams.iframeUrl)
        
        if (directUrl) {
          return NextResponse.json({
            success: true,
            anime: { id: anime.id, title: anime.name },
            episode: { number: episodeNumber },
            sources: [{
              url: directUrl,
              quality: "auto",
              isM3U8: directUrl.includes(".m3u8"),
            }],
            provider: "anipub",
            isDemo: false,
          })
        }
        
        // Return iframe URL for embedding
        return NextResponse.json({
          success: true,
          anime: { id: anime.id, title: anime.name },
          episode: { number: episodeNumber },
          sources: [{
            url: streams.iframeUrl,
            quality: "auto",
            isM3U8: false,
            type: "iframe",
          }],
          provider: "anipub",
          isDemo: false,
          isIframe: true,
        })
      }
    }
    
    // Fallback to demo
    console.log("[v0] No sources found, using demo")
    return NextResponse.json({
      success: true,
      anime: { title: animeTitle },
      episode: { number: episodeNumber },
      sources: DEMO_STREAMS,
      isDemo: true,
      message: "Fontes reais indisponíveis",
    })
  } catch (error) {
    console.error("[v0] Addon API error:", error)
    return NextResponse.json({
      success: true,
      sources: DEMO_STREAMS,
      isDemo: true,
      error: "Internal error",
    })
  }
}
