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

// Types
export interface StreamSource {
  id: string
  name: string
  quality: string
  url: string
  isM3U8: boolean
  status: "active" | "buffering" | "error"
}

export interface Provider {
  id: ConsumetProvider
  name: string
  status: "online" | "offline" | "degraded"
  enabled: boolean
  latency?: number
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
  activeProvider: ConsumetProvider
  providers: Provider[]
  
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
}

interface StreamingContextType extends StreamingState {
  // Provider actions
  setActiveProvider: (providerId: ConsumetProvider) => void
  toggleProvider: (providerId: ConsumetProvider, enabled: boolean) => void
  
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
}

// Default providers based on Consumet availability
const defaultProviders: Provider[] = [
  { 
    id: "gogoanime", 
    name: PROVIDER_INFO.gogoanime.name, 
    status: PROVIDER_INFO.gogoanime.status, 
    enabled: true, 
    latency: 45,
  },
  { 
    id: "zoro", 
    name: PROVIDER_INFO.zoro.name, 
    status: PROVIDER_INFO.zoro.status, 
    enabled: true, 
    latency: 120,
  },
  { 
    id: "animefox", 
    name: PROVIDER_INFO.animefox.name, 
    status: PROVIDER_INFO.animefox.status, 
    enabled: false, 
    latency: 200,
  },
  { 
    id: "animepahe", 
    name: PROVIDER_INFO.animepahe.name, 
    status: PROVIDER_INFO.animepahe.status, 
    enabled: false, 
    latency: 180,
  },
]

const StreamingContext = createContext<StreamingContextType | null>(null)

export function StreamingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StreamingState>({
    activeProvider: "gogoanime",
    providers: defaultProviders,
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
  })

  const setActiveProvider = useCallback((providerId: ConsumetProvider) => {
    setState(prev => {
      const provider = prev.providers.find(p => p.id === providerId)
      if (!provider || !provider.enabled || provider.status === "offline") {
        return prev
      }
      return { ...prev, activeProvider: providerId }
    })
  }, [])

  const toggleProvider = useCallback((providerId: ConsumetProvider, enabled: boolean) => {
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

      // Get streaming sources
      const streamInfo = await getStreamingSources(consumetEpisodeId, state.activeProvider)
      
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
      }))
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

  return (
    <StreamingContext.Provider value={{
      ...state,
      setActiveProvider,
      toggleProvider,
      loadAnimeEpisodes,
      playEpisode,
      playEpisodeByNumber,
      switchSource,
      setIsPlaying,
      setIsBuffering,
      setHlsReady,
      clearError,
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
