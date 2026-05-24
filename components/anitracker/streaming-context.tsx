"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import {
  searchAnime,
  getAnimeInfo,
  getStreamingSources,
  getBestSource,
  findAnimeInConsumet,
  PROVIDER_INFO,
  type ConsumetProvider,
  type ConsumetAnimeInfo,
  type ConsumetEpisode,
  type ConsumetStreamSource,
} from "@/lib/consumet-api"
import { 
  BR_ANIME_PROVIDERS, 
  getPTBRProviders,
  type AnimeProvider as BRProvider 
} from "@/lib/br-anime-providers"

// Types
export interface StreamSource {
  id: string
  name: string
  quality: string
  url: string
  isM3U8: boolean
  status: "active" | "buffering" | "error"
  type?: "hls" | "mp4" | "iframe"
}

export interface Subtitle {
  url: string
  lang: string
  label?: string
}

export interface Provider {
  id: string
  name: string
  status: "online" | "offline" | "degraded" | "testing"
  enabled: boolean
  latency?: number
  hasSubtitles?: boolean
  languages?: string[]
  isCustom?: boolean
  url?: string
}

export interface Addon {
  id: string
  name: string
  url: string
  status: "testing" | "online" | "offline"
  type: "scraper" | "tracker" | "subtitle"
  providerId?: string
}

export interface Episode {
  id: string
  number: number
  title: string
  thumbnail: string
  duration: string
  animeId: string
  animeTitle: string
  consumetEpisodeId?: string
  malId?: number
}

export interface AnimePlaylist {
  animeId: string
  animeTitle: string
  consumetId: string
  totalEpisodes: number
  episodes: Episode[]
}

interface StreamingState {
  // Active provider for scraping
  activeProvider: string
  providers: Provider[]
  addons: Addon[]
  
  // Current anime & playlist
  currentAnime: AnimePlaylist | null
  
  // Current playback state
  currentEpisode: Episode | null
  currentSource: StreamSource | null
  availableSources: StreamSource[]
  streamUrl: string | null
  
  // Player state
  isPlaying: boolean
  isBuffering: boolean
  hlsReady: boolean
  
  // Loading states
  isLoadingEpisodes: boolean
  isLoadingStream: boolean
  error: string | null
  
  // Stream metadata
  intro?: { start: number; end: number }
  outro?: { start: number; end: number }
  streamHeaders?: Record<string, string>
  
  // Subtitles
  subtitles: Subtitle[]
  activeSubtitle: Subtitle | null
}

interface StreamingContextType extends StreamingState {
  // Provider actions
  setActiveProvider: (providerId: string) => void
  toggleProvider: (providerId: string, enabled: boolean) => void
  
  // Addon actions
  addAddon: (url: string, type?: Addon["type"]) => Promise<void>
  removeAddon: (addonId: string) => void
  testAddon: (addonId: string) => Promise<void>
  
  // Anime & Episode actions
  loadAnimeEpisodes: (animeId: string, animeTitle: string, thumbnail?: string) => Promise<void>
  playEpisode: (episode: Episode) => Promise<void>
  playEpisodeByNumber: (episodeNumber: number) => Promise<void>
  
  // Source actions
  switchSource: (sourceId: string) => void
  
  // Player actions
  setIsPlaying: (playing: boolean) => void
  setIsBuffering: (buffering: boolean) => void
  setHlsReady: (ready: boolean) => void
  clearError: () => void
  
  // Subtitle actions
  setActiveSubtitle: (subtitle: Subtitle | null) => void
}

// Default addons
const defaultAddons: Addon[] = [
  { id: "consumet-1", name: "Consumet API", url: "https://api.consumet.org", status: "online", type: "scraper", providerId: "gogoanime" },
  { id: "zoro-1", name: "Zoro Provider", url: "https://zoro.to", status: "online", type: "scraper", providerId: "zoro" },
  { id: "nyaa-1", name: "Nyaa.si", url: "https://nyaa.si/", status: "online", type: "scraper", providerId: "nyaa" },
  { id: "nekobt-1", name: "NekoBT", url: "https://nekobt.to/search?group_id=7251504327481&media_id=s1392", status: "online", type: "scraper", providerId: "nekobt" },
  // PT-BR Subtitle sources
  { id: "opensubtitles-1", name: "OpenSubtitles PT-BR", url: "https://www.opensubtitles.org/pb", status: "online", type: "subtitle" },
  { id: "animedb-1", name: "AnimeDB Fansubs", url: "https://animedb.org", status: "online", type: "subtitle" },
]

// Convert BR_ANIME_PROVIDERS to our Provider format
const brProvidersToContext = (): Provider[] => {
  return BR_ANIME_PROVIDERS
    .filter(p => p.status !== "offline")
    .slice(0, 15) // Limit to top 15 providers
    .map(p => ({
      id: p.id,
      name: p.name,
      status: p.status as Provider["status"],
      enabled: p.priority <= 5, // Enable top 5 by default
      latency: 50 + (p.priority * 10),
      hasSubtitles: p.hasSub,
      languages: p.languages,
      isCustom: false,
      url: p.embedPattern,
    }))
}

// Default providers - combines Consumet and BR providers
const defaultProviders: Provider[] = [
  // Main Consumet providers
  { 
    id: "gogoanime", 
    name: PROVIDER_INFO.gogoanime.name, 
    status: PROVIDER_INFO.gogoanime.status, 
    enabled: true, 
    latency: 45,
    hasSubtitles: false,
    languages: ["English"],
  },
  { 
    id: "zoro", 
    name: PROVIDER_INFO.zoro.name, 
    status: PROVIDER_INFO.zoro.status, 
    enabled: true, 
    latency: 120,
    hasSubtitles: true,
    languages: ["English", "Portuguese", "Spanish"],
  },
  // BR Providers with PT-BR support
  ...brProvidersToContext(),
]

const StreamingContext = createContext<StreamingContextType | null>(null)

export function StreamingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StreamingState>({
    activeProvider: "gogoanime",
    providers: defaultProviders,
    addons: defaultAddons,
    currentAnime: null,
    currentEpisode: null,
    currentSource: null,
    availableSources: [],
    streamUrl: null,
    isPlaying: false,
    isBuffering: false,
    hlsReady: false,
    isLoadingEpisodes: false,
    isLoadingStream: false,
    error: null,
    subtitles: [],
    activeSubtitle: null,
    intro: undefined,
    outro: undefined,
    streamHeaders: undefined,
  })

  const setActiveProvider = useCallback((providerId: string) => {
    setState(prev => {
      const provider = prev.providers.find(p => p.id === providerId)
      if (!provider || !provider.enabled || provider.status === "offline") {
        return prev
      }
      return { ...prev, activeProvider: providerId }
    })
  }, [])

  const toggleProvider = useCallback((providerId: string, enabled: boolean) => {
    setState(prev => ({
      ...prev,
      providers: prev.providers.map(p => 
        p.id === providerId ? { ...p, enabled } : p
      ),
      activeProvider: prev.activeProvider === providerId && !enabled
        ? prev.providers.find(p => p.id !== providerId && p.enabled && p.status !== "offline")?.id || "gogoanime"
        : prev.activeProvider
    }))
  }, [])

  // Add a new addon and create corresponding provider
  const addAddon = useCallback(async (url: string, type: Addon["type"] = "scraper") => {
    const addonId = `addon-${Date.now()}`
    const providerId = `custom-${Date.now()}`
    
    // Create addon in testing state
    const newAddon: Addon = {
      id: addonId,
      name: "Testando...",
      url,
      status: "testing",
      type,
      providerId: type === "scraper" ? providerId : undefined,
    }
    
    setState(prev => ({
      ...prev,
      addons: [...prev.addons, newAddon],
    }))
    
    // Simulate testing the addon
    try {
      // Try to fetch the manifest
      const response = await fetch(url, { 
        method: "HEAD",
        mode: "no-cors",
      }).catch(() => null)
      
      // Extract name from URL
      const urlObj = new URL(url)
      const name = urlObj.hostname.replace("www.", "").split(".")[0]
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1) + " Provider"
      
      // Update addon to online
      setState(prev => ({
        ...prev,
        addons: prev.addons.map(a => 
          a.id === addonId 
            ? { ...a, name: formattedName, status: "online" as const }
            : a
        ),
      }))
      
      // If it's a scraper, create a provider
      if (type === "scraper") {
        const newProvider: Provider = {
          id: providerId,
          name: formattedName,
          status: "online",
          enabled: true,
          latency: Math.floor(Math.random() * 200) + 50,
          hasSubtitles: false,
          languages: ["English"],
          isCustom: true,
          url,
        }
        
        setState(prev => ({
          ...prev,
          providers: [...prev.providers, newProvider],
        }))
      }
    } catch {
      // Mark as offline if test failed
      setState(prev => ({
        ...prev,
        addons: prev.addons.map(a => 
          a.id === addonId 
            ? { ...a, name: "Provider Inválido", status: "offline" as const }
            : a
        ),
      }))
    }
  }, [])

  // Remove addon and its corresponding provider
  const removeAddon = useCallback((addonId: string) => {
    setState(prev => {
      const addon = prev.addons.find(a => a.id === addonId)
      const newAddons = prev.addons.filter(a => a.id !== addonId)
      
      // If addon had a provider, remove it too
      let newProviders = prev.providers
      let newActiveProvider = prev.activeProvider
      
      if (addon?.providerId) {
        newProviders = prev.providers.filter(p => p.id !== addon.providerId)
        if (prev.activeProvider === addon.providerId) {
          newActiveProvider = newProviders.find(p => p.enabled && p.status !== "offline")?.id || "gogoanime"
        }
      }
      
      return {
        ...prev,
        addons: newAddons,
        providers: newProviders,
        activeProvider: newActiveProvider,
      }
    })
  }, [])

  // Re-test an addon
  const testAddon = useCallback(async (addonId: string) => {
    setState(prev => ({
      ...prev,
      addons: prev.addons.map(a => 
        a.id === addonId ? { ...a, status: "testing" as const } : a
      ),
    }))
    
    const addon = state.addons.find(a => a.id === addonId)
    if (!addon) return
    
    try {
      await fetch(addon.url, { method: "HEAD", mode: "no-cors" }).catch(() => null)
      
      setState(prev => ({
        ...prev,
        addons: prev.addons.map(a => 
          a.id === addonId ? { ...a, status: "online" as const } : a
        ),
        providers: prev.providers.map(p => 
          p.id === addon.providerId ? { ...p, status: "online" as const } : p
        ),
      }))
    } catch {
      setState(prev => ({
        ...prev,
        addons: prev.addons.map(a => 
          a.id === addonId ? { ...a, status: "offline" as const } : a
        ),
        providers: prev.providers.map(p => 
          p.id === addon.providerId ? { ...p, status: "offline" as const } : p
        ),
      }))
    }
  }, [state.addons])

  // Load episodes for an anime using Consumet API
  const loadAnimeEpisodes = useCallback(async (
    animeId: string, 
    animeTitle: string,
    thumbnail?: string
  ) => {
    setState(prev => ({ 
      ...prev, 
      isLoadingEpisodes: true, 
      error: null 
    }))

    try {
      // Search for the anime in Consumet
      const consumetAnime = await findAnimeInConsumet(animeTitle, state.activeProvider)
      
      if (!consumetAnime) {
        throw new Error(`Anime "${animeTitle}" não encontrado no provedor`)
      }

      // Get full anime info with episodes
      const animeInfo = await getAnimeInfo(consumetAnime.id, state.activeProvider)
      
      if (!animeInfo || !animeInfo.episodes || animeInfo.episodes.length === 0) {
        throw new Error("Nenhum episódio encontrado para este anime")
      }

      // Convert to our Episode format
      const episodes: Episode[] = animeInfo.episodes.map((ep) => ({
        id: `${animeId}-ep-${ep.number}`,
        number: ep.number,
        title: `Episódio ${ep.number}`,
        thumbnail: thumbnail || consumetAnime.image,
        duration: "24:00",
        animeId: animeId,
        animeTitle: animeTitle,
        consumetEpisodeId: ep.id,
      }))

      const playlist: AnimePlaylist = {
        animeId,
        animeTitle,
        consumetId: consumetAnime.id,
        totalEpisodes: animeInfo.totalEpisodes || episodes.length,
        episodes,
      }

      setState(prev => ({
        ...prev,
        currentAnime: playlist,
        isLoadingEpisodes: false,
      }))

      return
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar episódios"
      setState(prev => ({
        ...prev,
        isLoadingEpisodes: false,
        error: message,
      }))
    }
  }, [state.activeProvider])

  // Play a specific episode - fetches stream URL from Consumet
  const playEpisode = useCallback(async (episode: Episode) => {
    setState(prev => ({
      ...prev,
      currentEpisode: episode,
      isBuffering: true,
      isLoadingStream: true,
      hlsReady: false,
      streamUrl: null,
      availableSources: [],
      error: null,
    }))

    try {
      // If we don't have the consumet episode ID, we need to load the anime first
      let consumetEpisodeId = episode.consumetEpisodeId

      if (!consumetEpisodeId) {
        // Search and get episode ID
        const consumetAnime = await findAnimeInConsumet(episode.animeTitle, state.activeProvider)
        if (!consumetAnime) {
          throw new Error("Anime não encontrado no provedor")
        }

        const animeInfo = await getAnimeInfo(consumetAnime.id, state.activeProvider)
        if (!animeInfo?.episodes) {
          throw new Error("Episódios não encontrados")
        }

        const foundEpisode = animeInfo.episodes.find(ep => ep.number === episode.number)
        if (!foundEpisode) {
          throw new Error(`Episódio ${episode.number} não encontrado`)
        }

        consumetEpisodeId = foundEpisode.id
      }

      // Get streaming sources - pass anime title for better search
      const streamInfo = await getStreamingSources(
        consumetEpisodeId, 
        state.activeProvider,
        "gogocdn",
        episode.animeTitle
      )
      
      if (!streamInfo || !streamInfo.sources || streamInfo.sources.length === 0) {
        throw new Error("Nenhuma fonte de streaming disponível")
      }

      // Convert to our StreamSource format
      const sources: StreamSource[] = streamInfo.sources.map((source, index) => ({
        id: `source-${index}-${source.quality}`,
        name: `${state.activeProvider} ${source.quality}`,
        quality: source.quality,
        url: source.url,
        isM3U8: source.isM3U8,
        status: "active" as const,
        type: (source.type || (streamInfo.isIframe ? "iframe" : (source.isM3U8 ? "hls" : "mp4"))) as StreamSource["type"],
      }))

      // Get best quality source
      const bestSource = getBestSource(streamInfo.sources)
      const currentSource = sources.find(s => s.url === bestSource?.url) || sources[0]

      setState(prev => ({
        ...prev,
        availableSources: sources,
        currentSource,
        streamUrl: currentSource.url,
        isLoadingStream: false,
        isBuffering: false,
        hlsReady: true,
        isPlaying: true,
        intro: streamInfo.intro,
        outro: streamInfo.outro,
        streamHeaders: streamInfo.headers,
      }))

      // Fetch subtitles in background (don't block playback)
      fetchSubtitles(episode.animeTitle, episode.number, episode.malId)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar stream"
      setState(prev => ({
        ...prev,
        isLoadingStream: false,
        isBuffering: false,
        error: message,
      }))
    }
  }, [state.activeProvider])

  // Fetch subtitles from multiple APIs
  const fetchSubtitles = useCallback(async (title: string, episode: number, malId?: number) => {
    try {
      const params = new URLSearchParams({
        title,
        episode: episode.toString(),
      })
      if (malId) params.append("malId", malId.toString())

      const response = await fetch(`/api/subtitles?${params}`)
      if (!response.ok) return

      const data = await response.json()
      if (data.success && data.subtitles?.length > 0) {
        setState(prev => ({
          ...prev,
          subtitles: data.subtitles.map((sub: { url: string; lang: string; label: string }) => ({
            url: sub.url,
            lang: sub.lang,
            label: sub.label,
          })),
        }))
      }
    } catch {
      // Silent fail - subtitles are optional
    }
  }, [])

  // Play episode by number from current playlist
  const playEpisodeByNumber = useCallback(async (episodeNumber: number) => {
    const episode = state.currentAnime?.episodes.find(ep => ep.number === episodeNumber)
    if (episode) {
      await playEpisode(episode)
    }
  }, [state.currentAnime, playEpisode])

  // Switch to a different source
  const switchSource = useCallback((sourceId: string) => {
    setState(prev => {
      const newSource = prev.availableSources.find(s => s.id === sourceId)
      if (!newSource) return prev
      
      return {
        ...prev,
        currentSource: newSource,
        streamUrl: newSource.url,
        isBuffering: true,
        hlsReady: false,
      }
    })
    
    // Brief buffer simulation for source switch
    setTimeout(() => {
      setState(prev => ({ ...prev, isBuffering: false, hlsReady: true }))
    }, 500)
  }, [])

  const setIsPlaying = useCallback((playing: boolean) => {
    setState(prev => ({ ...prev, isPlaying: playing }))
  }, [])

  const setIsBuffering = useCallback((buffering: boolean) => {
    setState(prev => ({ ...prev, isBuffering: buffering }))
  }, [])

  const setHlsReady = useCallback((ready: boolean) => {
    setState(prev => ({ ...prev, hlsReady: ready }))
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const setActiveSubtitle = useCallback((subtitle: Subtitle | null) => {
    setState(prev => ({ ...prev, activeSubtitle: subtitle }))
  }, [])

  return (
    <StreamingContext.Provider value={{
      ...state,
      setActiveProvider,
      toggleProvider,
      addAddon,
      removeAddon,
      testAddon,
      loadAnimeEpisodes,
      playEpisode,
      playEpisodeByNumber,
      switchSource,
      setIsPlaying,
      setIsBuffering,
      setHlsReady,
      clearError,
      setActiveSubtitle,
    }}>
      {children}
    </StreamingContext.Provider>
  )
}

export function useStreaming() {
  const context = useContext(StreamingContext)
  if (!context) {
    throw new Error("useStreaming must be used within a StreamingProvider")
  }
  return context
}
