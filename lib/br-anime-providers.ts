/**
 * Brazilian Anime Streaming Providers
 * Comprehensive list of providers with PT-BR subtitles/dubs
 * Based on pirataria.link/otaku research
 */

export interface AnimeProvider {
  id: string
  name: string
  shortName: string
  status: "online" | "offline" | "degraded" | "testing"
  languages: string[]
  hasPTBR: boolean
  hasDub: boolean
  hasSub: boolean
  priority: number // Lower = higher priority
  type: "iframe" | "api" | "scraper"
  embedPattern?: string // URL pattern with placeholders: {malId}, {anilistId}, {title}, {episode}
  searchPattern?: string
  notes?: string
  quality: "HD" | "FHD" | "4K" | "SD" | "Auto"
  adFree: boolean
  requiresProxy?: boolean
}

// ============================
// MAIN PROVIDERS - PT-BR FOCUS
// ============================

export const BR_ANIME_PROVIDERS: AnimeProvider[] = [
  // ============================================================
  // TIER 1: VERIFIED WORKING IFRAMES (Tested 2026-05-24)
  // ============================================================
  // O Megaplay (animeplay.cfd) funciona porque:
  // 1. Não tem header X-Frame-Options bloqueante
  // 2. Não usa Cloudflare agressivo
  // 3. Permite embed de qualquer domínio
  // 4. URL simples com MAL/AniList ID
  // NOTA: Legendas são HARDSUB (queimadas no vídeo em inglês)
  
  {
    id: "megaplay-mal",
    name: "Megaplay",
    shortName: "Mega",
    status: "online",
    languages: ["English"],
    hasPTBR: false, // Legendas são hardsub em inglês
    hasDub: true,
    hasSub: true,
    priority: 1,
    type: "iframe",
    embedPattern: "https://animeplay.cfd/stream/mal/{malId}/{episode}/sub",
    quality: "FHD",
    adFree: false,
    notes: "VERIFIED - Legendas EN hardsub, Skip Intro, vasto catálogo"
  },
  {
    id: "megaplay-mal-dub",
    name: "Megaplay DUB",
    shortName: "MegaDub",
    status: "online",
    languages: ["English"],
    hasPTBR: false,
    hasDub: true,
    hasSub: false,
    priority: 2,
    type: "iframe",
    embedPattern: "https://animeplay.cfd/stream/mal/{malId}/{episode}/dub",
    quality: "FHD",
    adFree: false,
    notes: "VERIFIED - Áudio dublado EN, Skip Intro"
  },
  {
    id: "megaplay-ani",
    name: "Megaplay (AniList)",
    shortName: "MegaAni",
    status: "online",
    languages: ["English"],
    hasPTBR: false,
    hasDub: true,
    hasSub: true,
    priority: 3,
    type: "iframe",
    embedPattern: "https://animeplay.cfd/stream/ani/{anilistId}/{episode}/sub",
    quality: "FHD",
    adFree: false,
    notes: "VERIFIED - Alternativa com AniList ID"
  },
  {
    id: "megaplay-ani-dub",
    name: "Megaplay DUB (AniList)",
    shortName: "MegaAniDub",
    status: "online",
    languages: ["English"],
    hasPTBR: false,
    hasDub: true,
    hasSub: false,
    priority: 4,
    type: "iframe",
    embedPattern: "https://animeplay.cfd/stream/ani/{anilistId}/{episode}/dub",
    quality: "FHD",
    adFree: false,
    notes: "VERIFIED - Áudio dublado EN com AniList ID"
  },
  
  // ============================================================
  // TIER 2: SITES BRASILEIROS (requerem slug, não MAL ID)
  // ============================================================
  // Estes providers têm legendas PT-BR mas precisam de slug
  // ao invés de MAL ID, então são mais difíceis de integrar
  {
    id: "anitube",
    name: "AniTube",
    shortName: "Tube",
    status: "online",
    languages: ["Portuguese"],
    hasPTBR: true,
    hasDub: true,
    hasSub: true,
    priority: 7,
    type: "iframe",
    embedPattern: "https://www.anitube.vip/embed/{slug}/{episode}",
    quality: "HD",
    adFree: false,
    notes: "Clássico brasileiro"
  },
  {
    id: "hinatasoul",
    name: "Hinata Soul",
    shortName: "Hinata",
    status: "online",
    languages: ["Portuguese"],
    hasPTBR: true,
    hasDub: false,
    hasSub: true,
    priority: 8,
    type: "iframe",
    embedPattern: "https://www.hinatasoul.com/embed/{slug}/{episode}",
    quality: "HD",
    adFree: false,
    notes: "Legendas próprias"
  },
  {
    id: "animeyabu",
    name: "Anime Yabu",
    shortName: "Yabu",
    status: "online",
    languages: ["Portuguese"],
    hasPTBR: true,
    hasDub: true,
    hasSub: true,
    priority: 8,
    type: "iframe",
    embedPattern: "https://animeyabu.com/embed/{slug}/{episode}",
    quality: "HD",
    adFree: false,
    notes: "Catálogo extenso"
  },
  {
    id: "animesdigital",
    name: "Animes Digital",
    shortName: "Digital",
    status: "online",
    languages: ["Portuguese"],
    hasPTBR: true,
    hasDub: true,
    hasSub: true,
    priority: 9,
    type: "iframe",
    embedPattern: "https://animesdigital.org/embed/{slug}/{episode}",
    quality: "HD",
    adFree: false,
    notes: "Servidor próprio"
  },
  {
    id: "redecanais",
    name: "RedeCanais",
    shortName: "Rede",
    status: "online",
    languages: ["Portuguese"],
    hasPTBR: true,
    hasDub: true,
    hasSub: false,
    priority: 10,
    type: "iframe",
    embedPattern: "https://redecanais.gs/embed/{slug}/{episode}",
    quality: "FHD",
    adFree: false,
    notes: "Recomendado, excelente qualidade PT-BR, download Mega"
  },
  
  // === TIER 3: International with PT-BR Support ===
  {
    id: "zoro",
    name: "Zoro/Aniwatch",
    shortName: "Zoro",
    status: "online",
    languages: ["English", "Portuguese", "Spanish", "Japanese"],
    hasPTBR: true,
    hasDub: false,
    hasSub: true,
    priority: 11,
    type: "iframe",
    embedPattern: "https://aniwatch.to/embed/{anilistId}/{episode}",
    quality: "FHD",
    adFree: true,
    notes: "Multi-idioma, legendas PT-BR"
  },
  {
    id: "gogoanime",
    name: "GogoAnime",
    shortName: "Gogo",
    status: "online",
    languages: ["English", "Portuguese"],
    hasPTBR: false,
    hasDub: true,
    hasSub: true,
    priority: 12,
    type: "iframe",
    embedPattern: "https://gogoanime3.co/embed/{slug}-episode-{episode}",
    quality: "HD",
    adFree: false,
    notes: "Principal internacional"
  },
  {
    id: "4anime",
    name: "4Anime",
    shortName: "4Ani",
    status: "online",
    languages: ["English", "Portuguese"],
    hasPTBR: true,
    hasDub: false,
    hasSub: true,
    priority: 13,
    type: "iframe",
    embedPattern: "https://4anime.gg/embed/{slug}/{episode}",
    quality: "HD",
    adFree: false,
    notes: "Legendas em múltiplos idiomas"
  },
  
  // === EMBED AGGREGATORS ===
  {
    id: "embedplayer",
    name: "EmbedPlayer",
    shortName: "Embed",
    status: "online",
    languages: ["Portuguese", "English", "Spanish"],
    hasPTBR: true,
    hasDub: true,
    hasSub: true,
    priority: 14,
    type: "iframe",
    embedPattern: "https://embedplayer.online/e/{malId}/{episode}",
    quality: "Auto",
    adFree: false,
    notes: "Agregador de fontes"
  },
  {
    id: "superflixapi",
    name: "SuperFlix API",
    shortName: "SFlux",
    status: "online",
    languages: ["Portuguese", "English"],
    hasPTBR: true,
    hasDub: true,
    hasSub: true,
    priority: 15,
    type: "iframe",
    embedPattern: "https://superflixapi.dev/anime/{malId}/{episode}",
    quality: "FHD",
    adFree: true,
    notes: "API gratuita"
  },
  {
    id: "vidsrc",
    name: "VidSrc Anime",
    shortName: "VSrc",
    status: "online",
    languages: ["English", "Portuguese"],
    hasPTBR: true,
    hasDub: false,
    hasSub: true,
    priority: 16,
    type: "iframe",
    embedPattern: "https://vidsrc.cc/v2/embed/anime/{malId}/{episode}",
    quality: "FHD",
    adFree: true,
    notes: "Sem ads, legendas multi-idioma"
  },
  {
    id: "2embed",
    name: "2Embed Anime",
    shortName: "2Emb",
    status: "online",
    languages: ["English", "Portuguese", "Spanish"],
    hasPTBR: true,
    hasDub: true,
    hasSub: true,
    priority: 17,
    type: "iframe",
    embedPattern: "https://www.2embed.cc/embedanime/{malId}&ep={episode}",
    quality: "HD",
    adFree: false,
    notes: "Multi-servidor"
  },
  
  // === BACKUP/ALTERNATIVE SOURCES ===
  {
    id: "animesonlinecc",
    name: "Animes Online CC",
    shortName: "AOcc",
    status: "online",
    languages: ["Portuguese"],
    hasPTBR: true,
    hasDub: true,
    hasSub: true,
    priority: 18,
    type: "iframe",
    embedPattern: "https://animesonlinecc.to/embed/{slug}/{episode}",
    quality: "HD",
    adFree: false,
    notes: "Backup brasileiro"
  },
  {
    id: "tomato",
    name: "Tomato",
    shortName: "Tomato",
    status: "online",
    languages: ["Portuguese"],
    hasPTBR: true,
    hasDub: true,
    hasSub: true,
    priority: 19,
    type: "api",
    embedPattern: "https://tomato.to/embed/{slug}/{episode}",
    quality: "HD",
    adFree: true,
    notes: "App disponível, bloqueio DMCA desktop"
  },
  {
    id: "dattebayobr",
    name: "DattebayoBR",
    shortName: "DBR",
    status: "online",
    languages: ["Portuguese"],
    hasPTBR: true,
    hasDub: true,
    hasSub: true,
    priority: 20,
    type: "iframe",
    embedPattern: "https://dattebayobr.com/embed/{slug}/{episode}",
    quality: "HD",
    adFree: false,
    notes: "Especializado em mechas, tokusatsus, isekais"
  },
  {
    id: "q1n",
    name: "Q1N",
    shortName: "Q1N",
    status: "online",
    languages: ["Portuguese"],
    hasPTBR: true,
    hasDub: false,
    hasSub: true,
    priority: 21,
    type: "iframe",
    embedPattern: "https://q1n.net/embed/{slug}/{episode}",
    quality: "HD",
    adFree: false,
    notes: "Catálogo brasileiro"
  },
]

// Providers filtered by PT-BR support
export const PTBR_PROVIDERS = BR_ANIME_PROVIDERS.filter(p => p.hasPTBR)
  .sort((a, b) => a.priority - b.priority)

// Get provider by ID
export function getProvider(id: string): AnimeProvider | undefined {
  return BR_ANIME_PROVIDERS.find(p => p.id === id)
}

// Get active providers (online or degraded)
export function getActiveProviders(): AnimeProvider[] {
  return BR_ANIME_PROVIDERS.filter(p => p.status !== "offline")
    .sort((a, b) => a.priority - b.priority)
}

// Get PT-BR only providers
export function getPTBRProviders(): AnimeProvider[] {
  return PTBR_PROVIDERS.filter(p => p.status !== "offline")
}

// Generate embed URL for a provider
export function generateEmbedUrl(
  providerId: string,
  params: {
    malId?: number
    anilistId?: number
    title?: string
    slug?: string
    episode: number
    subOrDub?: "sub" | "dub"
  }
): string | null {
  const provider = getProvider(providerId)
  if (!provider || !provider.embedPattern) return null
  
  // Generate slug from title if not provided
  const slug = params.slug || (params.title 
    ? params.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    : "")
  
  let url = provider.embedPattern
    .replace("{malId}", params.malId?.toString() || "")
    .replace("{anilistId}", params.anilistId?.toString() || "")
    .replace("{title}", encodeURIComponent(params.title || ""))
    .replace("{slug}", slug)
    .replace("{episode}", params.episode.toString())
  
  // Handle sub/dub for providers that support it
  if (params.subOrDub === "dub" && provider.hasDub) {
    url = url.replace("/sub", "/dub")
  }
  
  return url
}

// Get all embed URLs for an anime episode (returns multiple sources)
export function getAllEmbedUrls(params: {
  malId?: number
  anilistId?: number
  title?: string
  slug?: string
  episode: number
  preferPTBR?: boolean
  subOrDub?: "sub" | "dub"
}): Array<{ providerId: string; provider: AnimeProvider; url: string }> {
  const providers = params.preferPTBR ? getPTBRProviders() : getActiveProviders()
  
  return providers
    .map(provider => {
      const url = generateEmbedUrl(provider.id, params)
      if (!url) return null
      return { providerId: provider.id, provider, url }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

// Subtitle providers/APIs for PT-BR
export const SUBTITLE_SOURCES = [
  {
    id: "opensubtitles",
    name: "OpenSubtitles",
    url: "https://www.opensubtitles.org/pb",
    languages: ["Portuguese", "English", "Spanish"],
    type: "api" as const,
  },
  {
    id: "animedb",
    name: "AnimeDB Fansubs",
    url: "https://animedb.org",
    languages: ["Portuguese"],
    type: "scraper" as const,
  },
  {
    id: "infoanime",
    name: "InfoAnime",
    url: "https://www.infoanime.com.br",
    languages: ["Portuguese"],
    type: "scraper" as const,
  },
  {
    id: "subscene",
    name: "Subscene",
    url: "https://subscene.com",
    languages: ["Portuguese", "English", "Spanish"],
    type: "scraper" as const,
  },
  {
    id: "legendasdivx",
    name: "Legendas Divx",
    url: "https://www.legendasdivx.pt",
    languages: ["Portuguese"],
    type: "scraper" as const,
  },
]
