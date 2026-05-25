import { NextResponse, type NextRequest } from "next/server"
import { extractStream, extractBestStream } from "@/lib/stream-extractor"

/**
 * API para extrair streams M3U8 diretos dos providers
 * Converte URLs de iframe em streams reproduziveis
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const url = searchParams.get("url")
  const provider = searchParams.get("provider") || "auto"
  const malId = searchParams.get("malId") ? parseInt(searchParams.get("malId")!) : undefined
  const episode = searchParams.get("episode") ? parseInt(searchParams.get("episode")!) : undefined
  
  if (!url && !malId) {
    return NextResponse.json(
      { success: false, error: "URL or malId is required" },
      { status: 400 }
    )
  }
  
  try {
    let result
    
    if (url) {
      // Extrai de URL especifica
      result = await extractStream(provider, url, malId, episode)
    } else if (malId && episode) {
      // Tenta extrair de APIs publicas
      result = await extractBestStream([], malId, episode)
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid parameters" },
        { status: 400 }
      )
    }
    
    if (!result.success || result.streams.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || "No streams found",
          data: { streams: [], subtitles: [] }
        },
        { status: 404 }
      )
    }
    
    // Converte streams para usar proxy se necessario
    const proxyBase = `/api/stream/proxy?`
    const proxiedStreams = result.streams.map(stream => {
      // Se o stream precisa de referer/CORS bypass, usa proxy
      if (stream.referer || needsProxy(stream.url)) {
        return {
          ...stream,
          url: `${proxyBase}url=${encodeURIComponent(stream.url)}&referer=${encodeURIComponent(stream.referer || "")}&type=${stream.type === "hls" ? "m3u8" : "segment"}`,
          originalUrl: stream.url,
          proxied: true,
        }
      }
      return { ...stream, proxied: false }
    })
    
    // Converte legendas para usar proxy se necessario
    const proxiedSubtitles = result.subtitles.map(sub => {
      if (needsProxy(sub.url)) {
        return {
          ...sub,
          url: `${proxyBase}url=${encodeURIComponent(sub.url)}&type=vtt`,
          originalUrl: sub.url,
          proxied: true,
        }
      }
      return { ...sub, proxied: false }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        streams: proxiedStreams,
        subtitles: proxiedSubtitles,
        // Recomenda o melhor stream (HLS preferido)
        recommended: proxiedStreams.find(s => s.type === "hls") || proxiedStreams[0],
      }
    })
  } catch (error) {
    console.error("[StreamExtract] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}

/**
 * Verifica se uma URL precisa passar pelo proxy
 */
function needsProxy(url: string): boolean {
  // URLs conhecidas que precisam de proxy
  const proxyDomains = [
    "megacloud",
    "filemoon",
    "streamwish",
    "vidstream",
    "vidstreaming",
    "gogocdn",
    "gogo",
    "rapidcloud",
    "consumet",
    "animepahe",
    "kwik",
    "streamsb",
    "streamtape",
    "doodstream",
    "fembed",
  ]
  
  return proxyDomains.some(domain => url.toLowerCase().includes(domain))
}

// POST para multiplas URLs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sources, malId, episode } = body as {
      sources?: Array<{ url: string; provider: string }>
      malId?: number
      episode?: number
    }
    
    if (!sources?.length && !malId) {
      return NextResponse.json(
        { success: false, error: "Sources array or malId is required" },
        { status: 400 }
      )
    }
    
    const result = await extractBestStream(sources || [], malId, episode)
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, data: { streams: [], subtitles: [] } },
        { status: 404 }
      )
    }
    
    const proxyBase = `/api/stream/proxy?`
    const proxiedStreams = result.streams.map(stream => ({
      ...stream,
      url: stream.referer 
        ? `${proxyBase}url=${encodeURIComponent(stream.url)}&referer=${encodeURIComponent(stream.referer)}&type=${stream.type === "hls" ? "m3u8" : "segment"}`
        : stream.url,
      proxied: !!stream.referer,
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        streams: proxiedStreams,
        subtitles: result.subtitles,
        recommended: proxiedStreams.find(s => s.type === "hls") || proxiedStreams[0],
      }
    })
  } catch (error) {
    console.error("[StreamExtract POST] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
