/**
 * Stream Extractor - Extrai URLs M3U8 diretas de providers
 * 
 * Baseado na arquitetura do Kuhi API e ReAnime:
 * - Usa AniList ID para buscar episodios
 * - Extrai streams HLS/M3U8 diretos
 * - Player nativo com softsub (sem iframes!)
 */

export interface ExtractedStream {
  url: string
  quality: string
  type: "hls" | "mp4"
  referer?: string
  headers?: Record<string, string>
  provider?: string
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

// Cache de streams extraidos (5 minutos)
const streamCache = new Map<string, { data: ExtractionResult; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

function getCachedStream(key: string): ExtractionResult | null {
  const cached = streamCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  streamCache.delete(key)
  return null
}

function setCachedStream(key: string, data: ExtractionResult): void {
  streamCache.set(key, { data, timestamp: Date.now() })
}

/**
 * Mapeamento MAL ID -> AniList ID
 * AniList e MAL geralmente tem o mesmo ID para animes populares
 * mas alguns sao diferentes
 */
async function getAnilistId(malId: number): Promise<number> {
  // Para a maioria dos animes, MAL ID = AniList ID
  // Mas podemos usar a API do AniList para confirmar
  try {
    const query = `
      query ($malId: Int) {
        Media(idMal: $malId, type: ANIME) {
          id
        }
      }
    `
    
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { malId },
      }),
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data?.data?.Media?.id) {
        return data.data.Media.id
      }
    }
  } catch {
    // Fallback para MAL ID
  }
  
  return malId
}

/**
 * Busca informacoes do episodio via Miruro pipe
 * O Miruro usa um sistema de providers encadeados
 */
async function fetchMiruroPipe(anilistId: number, episode: number): Promise<ExtractionResult> {
  const providers = ["zoro", "gogo", "animepahe", "9anime"]
  
  for (const provider of providers) {
    try {
      // Miruro pipe URL (baseado na documentacao do Kuhi API)
      const pipeUrl = `https://api.miruro.tv/anime/watch/${anilistId}?ep=${episode}&provider=${provider}`
      
      const response = await fetch(pipeUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "Referer": "https://miruro.tv/",
        },
        signal: AbortSignal.timeout(10000),
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      
      if (data?.sources && Array.isArray(data.sources)) {
        const streams: ExtractedStream[] = []
        const subtitles: ExtractedSubtitle[] = []
        
        for (const source of data.sources) {
          if (source.url) {
            streams.push({
              url: source.url,
              quality: source.quality || "auto",
              type: source.url.includes(".m3u8") ? "hls" : "mp4",
              referer: data.referer || `https://${provider}.to/`,
              provider,
            })
          }
        }
        
        if (data.subtitles && Array.isArray(data.subtitles)) {
          for (const sub of data.subtitles) {
            const isPTBR = /pt|por|portuguese|brazil/i.test(sub.lang || "")
            subtitles.push({
              url: sub.url,
              lang: isPTBR ? "pt-BR" : sub.lang || "en",
              label: sub.label || sub.lang || "Unknown",
              default: isPTBR,
            })
          }
        }
        
        if (streams.length > 0) {
          return { success: true, streams, subtitles }
        }
      }
    } catch {
      // Tenta proximo provider
      continue
    }
  }
  
  return { success: false, streams: [], subtitles: [], error: "No streams found from Miruro" }
}

/**
 * Extrai streams usando GogoAnime API alternativa
 */
async function fetchGogoAnime(title: string, episode: number): Promise<ExtractionResult> {
  try {
    // Normaliza o titulo para slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    
    const apiUrl = `https://anitaku.pe/watch/${slug}-episode-${episode}`
    
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(10000),
    })
    
    if (!response.ok) {
      return { success: false, streams: [], subtitles: [], error: "Failed to fetch" }
    }
    
    const html = await response.text()
    
    // Extrai URLs M3U8 do HTML
    const m3u8Matches = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/gi) || []
    const streams: ExtractedStream[] = []
    
    for (const url of m3u8Matches) {
      const cleanUrl = url.replace(/['"\\]/g, "")
      if (!streams.find(s => s.url === cleanUrl)) {
        streams.push({
          url: cleanUrl,
          quality: cleanUrl.includes("1080") ? "1080p" : cleanUrl.includes("720") ? "720p" : "auto",
          type: "hls",
          referer: "https://anitaku.pe/",
          provider: "gogoanime",
        })
      }
    }
    
    return {
      success: streams.length > 0,
      streams,
      subtitles: [],
      error: streams.length === 0 ? "No M3U8 found" : undefined,
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
 * Extrai streams via AllAnime API
 * AllAnime tem uma API GraphQL que retorna streams diretos
 */
async function fetchAllAnime(anilistId: number, episode: number): Promise<ExtractionResult> {
  try {
    const query = `
      query ($showId: String!, $ep: String!) {
        episode(showId: $showId, episodeString: $ep, translationType: "sub") {
          sourceUrls
        }
      }
    `
    
    const response = await fetch("https://api.allanime.day/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Referer": "https://allanime.to/",
      },
      body: JSON.stringify({
        query,
        variables: {
          showId: `${anilistId}`,
          ep: `${episode}`,
        },
      }),
      signal: AbortSignal.timeout(10000),
    })
    
    if (!response.ok) {
      return { success: false, streams: [], subtitles: [], error: "API error" }
    }
    
    const data = await response.json()
    const sourceUrls = data?.data?.episode?.sourceUrls || []
    
    const streams: ExtractedStream[] = []
    
    for (const source of sourceUrls) {
      if (source.sourceUrl && (source.sourceUrl.includes(".m3u8") || source.sourceUrl.includes("mp4"))) {
        streams.push({
          url: source.sourceUrl,
          quality: source.sourceName || "auto",
          type: source.sourceUrl.includes(".m3u8") ? "hls" : "mp4",
          referer: "https://allanime.to/",
          provider: "allanime",
        })
      }
    }
    
    return {
      success: streams.length > 0,
      streams,
      subtitles: [],
      error: streams.length === 0 ? "No streams found" : undefined,
    }
  } catch {
    return { success: false, streams: [], subtitles: [], error: "AllAnime fetch failed" }
  }
}

/**
 * Funcao principal - Tenta extrair de multiplos providers
 */
export async function extractStream(
  malId: number,
  episode: number,
  title?: string
): Promise<ExtractionResult> {
  const cacheKey = `stream-${malId}-${episode}`
  const cached = getCachedStream(cacheKey)
  if (cached) return cached
  
  // Obtem AniList ID
  const anilistId = await getAnilistId(malId)
  
  // Tenta providers em paralelo com timeout
  const results = await Promise.allSettled([
    fetchMiruroPipe(anilistId, episode),
    fetchAllAnime(anilistId, episode),
    title ? fetchGogoAnime(title, episode) : Promise.resolve({ success: false, streams: [], subtitles: [] } as ExtractionResult),
  ])
  
  // Combina todos os streams encontrados
  const allStreams: ExtractedStream[] = []
  const allSubtitles: ExtractedSubtitle[] = []
  
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      allStreams.push(...result.value.streams)
      allSubtitles.push(...result.value.subtitles)
    }
  }
  
  // Remove duplicatas
  const uniqueStreams = allStreams.filter((stream, index, self) =>
    index === self.findIndex(s => s.url === stream.url)
  )
  
  const uniqueSubtitles = allSubtitles.filter((sub, index, self) =>
    index === self.findIndex(s => s.url === sub.url)
  )
  
  // Prioriza legendas PT-BR
  uniqueSubtitles.sort((a, b) => {
    if (a.lang === "pt-BR" && b.lang !== "pt-BR") return -1
    if (a.lang !== "pt-BR" && b.lang === "pt-BR") return 1
    return 0
  })
  
  const finalResult: ExtractionResult = {
    success: uniqueStreams.length > 0,
    streams: uniqueStreams,
    subtitles: uniqueSubtitles,
    error: uniqueStreams.length === 0 ? "No streams found from any provider" : undefined,
  }
  
  if (finalResult.success) {
    setCachedStream(cacheKey, finalResult)
  }
  
  return finalResult
}

/**
 * Proxy para M3U8 - Necessario para CORS
 * O cliente deve chamar este endpoint para obter o playlist proxiado
 */
export function getProxyUrl(m3u8Url: string, referer: string): string {
  const params = new URLSearchParams({
    url: m3u8Url,
    referer,
  })
  return `/api/stream/proxy?${params.toString()}`
}
