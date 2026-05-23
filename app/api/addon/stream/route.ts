import { NextResponse } from "next/server"
import { 
  BR_ANIME_PROVIDERS, 
  generateEmbedUrl, 
  getProvider,
  getPTBRProviders,
  type AnimeProvider 
} from "@/lib/br-anime-providers"

// Jikan API for anime metadata (MyAnimeList)
const JIKAN_BASE = "https://api.jikan.moe/v4"

interface StreamSource {
  url: string
  quality: string
  isM3U8: boolean
  type?: string
  providerId: string
  providerName: string
  hasPTBR: boolean
  hasDub: boolean
}

interface StreamResponse {
  success: boolean
  sources: StreamSource[]
  subtitles?: { url: string; lang: string; label?: string }[]
  intro?: { start: number; end: number }
  outro?: { start: number; end: number }
  headers?: Record<string, string>
  isIframe?: boolean
  isDemo?: boolean
  provider?: string
  providers?: { id: string; name: string; status: string; hasPTBR: boolean }[]
  error?: string
  malId?: number
  anilistId?: number
}

// Search Jikan for MAL ID
async function searchJikan(title: string): Promise<{ mal_id: number; title: string; title_english?: string } | null> {
  const searchTerms = [
    title,
    title.replace(/[:\-–—]/g, " ").replace(/\s+/g, " ").trim(),
    title.split(":")[0].trim(),
    title.split(" ").slice(0, 3).join(" "),
  ]
  
  for (const term of searchTerms) {
    try {
      const url = `${JIKAN_BASE}/anime?q=${encodeURIComponent(term)}&limit=5&sfw=true`
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      const results = data.data || []
      
      if (results.length > 0) {
        return { 
          mal_id: results[0].mal_id, 
          title: results[0].title,
          title_english: results[0].title_english
        }
      }
    } catch {
      continue
    }
  }
  
  return null
}

// Search AniList for AniList ID (optional, for providers that need it)
async function searchAniList(title: string): Promise<number | null> {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        idMal
      }
    }
  `
  
  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { search: title } }),
      signal: AbortSignal.timeout(5000),
    })
    
    if (!response.ok) return null
    
    const data = await response.json()
    return data.data?.Media?.id || null
  } catch {
    return null
  }
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export async function GET(request: Request): Promise<NextResponse<StreamResponse>> {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get("title")
  const episodeStr = searchParams.get("episode") || "1"
  const episode = parseInt(episodeStr)
  const preferPTBR = searchParams.get("ptbr") !== "false" // Default to PT-BR
  const providerId = searchParams.get("provider") // Optional: specific provider
  const subOrDub = (searchParams.get("type") || "sub") as "sub" | "dub"

  if (!title) {
    return NextResponse.json({
      success: false,
      sources: [],
      error: "Título não fornecido",
      provider: "None",
    })
  }

  // Search for MAL ID and AniList ID in parallel
  const [jikanResult, anilistId] = await Promise.all([
    searchJikan(title),
    searchAniList(title)
  ])
  
  if (!jikanResult) {
    return NextResponse.json({
      success: false,
      sources: [],
      error: `Anime "${title}" não encontrado no MyAnimeList`,
      provider: "None",
    })
  }

  const malId = jikanResult.mal_id
  const slug = generateSlug(jikanResult.title_english || jikanResult.title)
  
  // Get providers based on preference
  let providers: AnimeProvider[]
  
  if (providerId) {
    // Specific provider requested
    const provider = getProvider(providerId)
    providers = provider ? [provider] : []
  } else if (preferPTBR) {
    // PT-BR providers first, then others
    providers = [...getPTBRProviders(), ...BR_ANIME_PROVIDERS.filter(p => !p.hasPTBR)]
      .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i) // Remove duplicates
  } else {
    providers = BR_ANIME_PROVIDERS
  }
  
  // Generate sources from all available providers
  const sources: StreamSource[] = []
  
  for (const provider of providers) {
    if (provider.status === "offline") continue
    
    const url = generateEmbedUrl(provider.id, {
      malId,
      anilistId: anilistId || undefined,
      title: jikanResult.title,
      slug,
      episode,
      subOrDub,
    })
    
    if (url) {
      // Add SUB source
      sources.push({
        url,
        quality: provider.quality === "Auto" ? "AUTO" : provider.quality,
        isM3U8: false,
        type: provider.type === "iframe" ? "iframe" : "hls",
        providerId: provider.id,
        providerName: provider.name,
        hasPTBR: provider.hasPTBR,
        hasDub: provider.hasDub,
      })
      
      // Add DUB source if provider supports it
      if (provider.hasDub && subOrDub !== "sub") {
        const dubUrl = generateEmbedUrl(provider.id, {
          malId,
          anilistId: anilistId || undefined,
          title: jikanResult.title,
          slug,
          episode,
          subOrDub: "dub",
        })
        
        if (dubUrl && dubUrl !== url) {
          sources.push({
            url: dubUrl,
            quality: `${provider.quality === "Auto" ? "AUTO" : provider.quality} DUB`,
            isM3U8: false,
            type: provider.type === "iframe" ? "iframe" : "hls",
            providerId: provider.id,
            providerName: `${provider.name} (DUB)`,
            hasPTBR: provider.hasPTBR,
            hasDub: true,
          })
        }
      }
    }
  }

  // Get available providers list for UI
  const availableProviders = providers
    .filter(p => p.status !== "offline")
    .map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      hasPTBR: p.hasPTBR,
    }))

  return NextResponse.json({
    success: sources.length > 0,
    sources,
    isIframe: true,
    provider: sources[0]?.providerName || "None",
    providers: availableProviders,
    malId,
    anilistId: anilistId || undefined,
  })
}
