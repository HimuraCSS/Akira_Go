/**
 * Stream Extractor - Extrai URLs M3U8 diretas dos providers
 * Converte iframes em streams nativos para player HLS.js
 */

export interface ExtractedStream {
  url: string
  quality: string
  type: "hls" | "mp4"
  referer?: string
  headers?: Record<string, string>
}

export interface ExtractedSubtitle {
  url: string
  lang: string
  label: string
  default?: boolean
}

export interface ExtractionResult {
  success: boolean
  streams: ExtractedStream[]
  subtitles: ExtractedSubtitle[]
  error?: string
}

/**
 * Extrai streams do Megaplay/AnimePlay
 * Provider: animeplay.cfd
 */
async function extractMegaplay(embedUrl: string): Promise<ExtractionResult> {
  try {
    // Megaplay retorna um player que carrega streams de terceiros
    // Precisamos extrair a URL do stream HLS
    const response = await fetch(embedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://animeplay.cfd/",
      },
    })
    
    if (!response.ok) {
      return { success: false, streams: [], subtitles: [], error: "Failed to fetch embed" }
    }
    
    const html = await response.text()
    
    // Procura por URLs M3U8 no HTML
    const m3u8Matches = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/gi) || []
    const mp4Matches = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/gi) || []
    
    // Procura por configuracao JSON do player
    const configMatch = html.match(/sources\s*:\s*\[([\s\S]*?)\]/i)
    let streams: ExtractedStream[] = []
    
    if (configMatch) {
      try {
        // Tenta extrair URLs da configuracao
        const urlMatches = configMatch[1].match(/file\s*:\s*["']([^"']+)["']/gi) || []
        for (const match of urlMatches) {
          const url = match.replace(/file\s*:\s*["']|["']/gi, "")
          if (url.includes(".m3u8")) {
            streams.push({ url, quality: "auto", type: "hls" })
          } else if (url.includes(".mp4")) {
            streams.push({ url, quality: "auto", type: "mp4" })
          }
        }
      } catch {
        // Ignorar erros de parsing
      }
    }
    
    // Adiciona matches diretos
    for (const url of m3u8Matches) {
      if (!streams.find(s => s.url === url)) {
        streams.push({ url, quality: "auto", type: "hls", referer: embedUrl })
      }
    }
    
    for (const url of mp4Matches) {
      if (!streams.find(s => s.url === url)) {
        streams.push({ url, quality: "auto", type: "mp4", referer: embedUrl })
      }
    }
    
    // Procura por legendas VTT
    const subtitles: ExtractedSubtitle[] = []
    const vttMatches = html.match(/https?:\/\/[^"'\s]+\.vtt[^"'\s]*/gi) || []
    const srtMatches = html.match(/https?:\/\/[^"'\s]+\.srt[^"'\s]*/gi) || []
    
    for (const url of [...vttMatches, ...srtMatches]) {
      const langMatch = url.match(/[_.-](pt|por|portuguese|en|eng|english|es|spa|spanish)/i)
      const lang = langMatch?.[1] || "unknown"
      const isPTBR = /pt|por|portuguese/i.test(lang)
      
      subtitles.push({
        url,
        lang: isPTBR ? "pt-BR" : lang,
        label: isPTBR ? "Portugues" : lang.toUpperCase(),
        default: isPTBR,
      })
    }
    
    return {
      success: streams.length > 0,
      streams,
      subtitles,
      error: streams.length === 0 ? "No streams found" : undefined,
    }
  } catch (error) {
    return {
      success: false,
      streams: [],
      subtitles: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Extrai streams do VidNest
 * Provider: vidnest.fun
 */
async function extractVidNest(embedUrl: string): Promise<ExtractionResult> {
  try {
    const response = await fetch(embedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://vidnest.fun/",
      },
    })
    
    if (!response.ok) {
      return { success: false, streams: [], subtitles: [], error: "Failed to fetch embed" }
    }
    
    const html = await response.text()
    
    // VidNest usa um formato especifico de configuracao
    const streams: ExtractedStream[] = []
    const subtitles: ExtractedSubtitle[] = []
    
    // Procura por URLs M3U8
    const m3u8Matches = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/gi) || []
    
    for (const url of m3u8Matches) {
      streams.push({
        url: url.replace(/\\u002F/g, "/"),
        quality: "auto",
        type: "hls",
        referer: embedUrl,
      })
    }
    
    // Procura por configuracao de tracks (legendas)
    const tracksMatch = html.match(/tracks\s*:\s*\[([\s\S]*?)\]/i)
    if (tracksMatch) {
      const trackMatches = tracksMatch[1].match(/\{[^}]+\}/g) || []
      for (const track of trackMatches) {
        const fileMatch = track.match(/file\s*:\s*["']([^"']+)["']/i)
        const labelMatch = track.match(/label\s*:\s*["']([^"']+)["']/i)
        const langMatch = track.match(/language\s*:\s*["']([^"']+)["']/i)
        
        if (fileMatch?.[1]) {
          const lang = langMatch?.[1] || labelMatch?.[1] || "unknown"
          const isPTBR = /pt|por|portuguese|brazil/i.test(lang)
          
          subtitles.push({
            url: fileMatch[1],
            lang: isPTBR ? "pt-BR" : lang,
            label: labelMatch?.[1] || lang,
            default: isPTBR,
          })
        }
      }
    }
    
    return {
      success: streams.length > 0,
      streams,
      subtitles,
      error: streams.length === 0 ? "No streams found" : undefined,
    }
  } catch (error) {
    return {
      success: false,
      streams: [],
      subtitles: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Extrai streams via API publica (consumet-like)
 * Tenta extrair de APIs publicas conhecidas
 */
async function extractFromPublicAPI(
  malId: number,
  episode: number,
  type: "sub" | "dub" = "sub"
): Promise<ExtractionResult> {
  const apis = [
    // Kuhi API - Python based
    `https://kuhi-api.vercel.app/anime/extract/${malId}?e=${episode}`,
    // Consumet fallback
    `https://api.consumet.org/anime/gogoanime/watch/${malId}-episode-${episode}`,
  ]
  
  for (const apiUrl of apis) {
    try {
      const response = await fetch(apiUrl, { 
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Akira-Go/1.0" }
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      const streams: ExtractedStream[] = []
      const subtitles: ExtractedSubtitle[] = []
      
      // Formato Kuhi API
      if (data.streams) {
        for (const stream of data.streams) {
          if (stream.url) {
            streams.push({
              url: stream.url,
              quality: stream.quality || "auto",
              type: stream.type === "hls" || stream.url.includes(".m3u8") ? "hls" : "mp4",
              referer: stream.referer,
            })
          }
        }
      }
      
      // Formato Consumet
      if (data.sources) {
        for (const source of data.sources) {
          if (source.url) {
            streams.push({
              url: source.url,
              quality: source.quality || "auto",
              type: source.isM3U8 || source.url.includes(".m3u8") ? "hls" : "mp4",
            })
          }
        }
      }
      
      // Legendas
      if (data.subtitles) {
        for (const sub of data.subtitles) {
          subtitles.push({
            url: sub.url,
            lang: sub.lang || "en",
            label: sub.label || sub.lang || "English",
          })
        }
      }
      
      if (streams.length > 0) {
        return { success: true, streams, subtitles }
      }
    } catch {
      // Tenta proxima API
      continue
    }
  }
  
  return { success: false, streams: [], subtitles: [], error: "No public API available" }
}

/**
 * Funcao principal para extrair streams de qualquer provider
 */
export async function extractStream(
  provider: string,
  embedUrl: string,
  malId?: number,
  episode?: number
): Promise<ExtractionResult> {
  // Tenta extrator especifico primeiro
  if (provider.includes("megaplay") || embedUrl.includes("animeplay")) {
    return extractMegaplay(embedUrl)
  }
  
  if (provider.includes("vidnest") || embedUrl.includes("vidnest")) {
    return extractVidNest(embedUrl)
  }
  
  // Fallback para API publica se temos malId e episode
  if (malId && episode) {
    return extractFromPublicAPI(malId, episode)
  }
  
  // Tenta extracao generica
  return {
    success: false,
    streams: [],
    subtitles: [],
    error: `No extractor available for provider: ${provider}`,
  }
}

/**
 * Tenta extrair streams de multiplos providers em paralelo
 */
export async function extractBestStream(
  sources: Array<{ url: string; provider: string }>,
  malId?: number,
  episode?: number
): Promise<ExtractionResult> {
  // Tenta API publica primeiro (mais confiavel)
  if (malId && episode) {
    const apiResult = await extractFromPublicAPI(malId, episode)
    if (apiResult.success && apiResult.streams.length > 0) {
      return apiResult
    }
  }
  
  // Tenta cada source em paralelo
  const results = await Promise.allSettled(
    sources.slice(0, 3).map(s => extractStream(s.provider, s.url, malId, episode))
  )
  
  // Retorna primeiro resultado com sucesso
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      return result.value
    }
  }
  
  return {
    success: false,
    streams: [],
    subtitles: [],
    error: "Failed to extract streams from all providers",
  }
}
