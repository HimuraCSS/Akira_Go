import { NextResponse, type NextRequest } from "next/server"
import { extractStream, getProxyUrl } from "@/lib/stream-extractor"

/**
 * API para extrair streams M3U8 diretos
 * 
 * Usa o novo sistema de extracao que:
 * - Converte MAL ID -> AniList ID
 * - Busca streams de Miruro, AllAnime, GogoAnime
 * - Retorna URLs M3U8 diretas para player HLS nativo
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const malId = searchParams.get("malId") ? parseInt(searchParams.get("malId")!) : undefined
  const episode = searchParams.get("episode") ? parseInt(searchParams.get("episode")!) : undefined
  const title = searchParams.get("title") || undefined
  
  if (!malId || !episode) {
    return NextResponse.json(
      { success: false, error: "malId and episode are required" },
      { status: 400 }
    )
  }
  
  try {
    const result = await extractStream(malId, episode, title)
    
    if (!result.success || result.streams.length === 0) {
      return NextResponse.json({
        success: false,
        error: result.error || "No streams found",
        data: { streams: [], subtitles: [] }
      }, { status: 404 })
    }
    
    // Converte streams para usar proxy CORS quando necessario
    const processedStreams = result.streams.map(stream => ({
      ...stream,
      url: stream.referer ? getProxyUrl(stream.url, stream.referer) : stream.url,
      originalUrl: stream.url,
      proxied: !!stream.referer,
    }))
    
    // Processa legendas
    const processedSubtitles = result.subtitles.map(sub => ({
      ...sub,
      url: `/api/stream/proxy?url=${encodeURIComponent(sub.url)}&type=vtt`,
      originalUrl: sub.url,
    }))
    
    // Encontra o melhor stream (HLS preferido, depois qualidade)
    const hlsStreams = processedStreams.filter(s => s.type === "hls")
    const recommended = hlsStreams.find(s => s.quality === "1080p") ||
                        hlsStreams.find(s => s.quality === "720p") ||
                        hlsStreams[0] ||
                        processedStreams[0]
    
    return NextResponse.json({
      success: true,
      data: {
        streams: processedStreams,
        subtitles: processedSubtitles,
        recommended,
        providers: [...new Set(processedStreams.map(s => s.provider))],
      }
    })
  } catch (error) {
    console.error("[StreamExtract] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Extraction failed"
    }, { status: 500 })
  }
}
