"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

// Types
export interface StreamSource {
  id: string
  name: string
  quality: string
  url: string
  status: "active" | "buffering" | "error"
}

export interface Provider {
  id: string
  name: string
  status: "online" | "offline" | "degraded"
  enabled: boolean
  latency?: number
  sources: StreamSource[]
}

export interface Episode {
  id: string
  number: number
  title: string
  thumbnail: string
  duration: string
  animeId: string
  animeTitle: string
}

interface StreamingState {
  // Active provider for scraping
  activeProvider: string | null
  providers: Provider[]
  
  // Current playback state
  currentEpisode: Episode | null
  currentSource: StreamSource | null
  availableSources: StreamSource[]
  
  // Player state
  isPlaying: boolean
  isBuffering: boolean
  hlsReady: boolean
}

interface StreamingContextType extends StreamingState {
  // Provider actions
  setActiveProvider: (providerId: string) => void
  toggleProvider: (providerId: string, enabled: boolean) => void
  
  // Playback actions
  playEpisode: (episode: Episode) => void
  switchSource: (sourceId: string) => void
  
  // Player actions
  setIsPlaying: (playing: boolean) => void
  setIsBuffering: (buffering: boolean) => void
}

// Default providers with mock sources
const defaultProviders: Provider[] = [
  { 
    id: "consumet", 
    name: "Consumet API", 
    status: "online", 
    enabled: true, 
    latency: 45,
    sources: [
      { id: "consumet-1080", name: "Consumet Alpha", quality: "1080p", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", status: "active" },
      { id: "consumet-720", name: "Consumet Beta", quality: "720p", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", status: "active" },
    ]
  },
  { 
    id: "gogoanime", 
    name: "GogoAnime", 
    status: "online", 
    enabled: true, 
    latency: 120,
    sources: [
      { id: "gogo-1080", name: "GogoAnime HD", quality: "1080p", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", status: "active" },
      { id: "gogo-480", name: "GogoAnime SD", quality: "480p", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", status: "active" },
    ]
  },
  { 
    id: "zoro", 
    name: "Zoro/Anicrush", 
    status: "degraded", 
    enabled: true, 
    latency: 250,
    sources: [
      { id: "zoro-1080", name: "Zoro Premium", quality: "1080p", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", status: "buffering" },
    ]
  },
  { 
    id: "animepahe", 
    name: "AnimePahe", 
    status: "offline", 
    enabled: false,
    sources: []
  },
]

const StreamingContext = createContext<StreamingContextType | null>(null)

export function StreamingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StreamingState>({
    activeProvider: "consumet",
    providers: defaultProviders,
    currentEpisode: null,
    currentSource: null,
    availableSources: [],
    isPlaying: false,
    isBuffering: false,
    hlsReady: false,
  })

  const setActiveProvider = useCallback((providerId: string) => {
    setState(prev => {
      const provider = prev.providers.find(p => p.id === providerId)
      if (!provider || !provider.enabled || provider.status === "offline") {
        return prev
      }
      
      // When switching provider, update available sources
      const newSources = provider.sources
      const newCurrentSource = newSources[0] || null
      
      return {
        ...prev,
        activeProvider: providerId,
        availableSources: newSources,
        currentSource: newCurrentSource,
        isBuffering: true,
        hlsReady: false,
      }
    })
    
    // Simulate HLS loading
    setTimeout(() => {
      setState(prev => ({ ...prev, isBuffering: false, hlsReady: true }))
    }, 800)
  }, [])

  const toggleProvider = useCallback((providerId: string, enabled: boolean) => {
    setState(prev => ({
      ...prev,
      providers: prev.providers.map(p => 
        p.id === providerId ? { ...p, enabled } : p
      ),
      // If disabling the active provider, switch to another
      activeProvider: prev.activeProvider === providerId && !enabled
        ? prev.providers.find(p => p.id !== providerId && p.enabled && p.status !== "offline")?.id || null
        : prev.activeProvider
    }))
  }, [])

  const playEpisode = useCallback((episode: Episode) => {
    setState(prev => {
      const provider = prev.providers.find(p => p.id === prev.activeProvider)
      const sources = provider?.sources || []
      const currentSource = sources[0] || null
      
      return {
        ...prev,
        currentEpisode: episode,
        availableSources: sources,
        currentSource,
        isPlaying: false,
        isBuffering: true,
        hlsReady: false,
      }
    })
    
    // Simulate HLS initialization
    setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        isBuffering: false, 
        hlsReady: true,
        isPlaying: true,
      }))
    }, 1200)
  }, [])

  const switchSource = useCallback((sourceId: string) => {
    setState(prev => {
      const newSource = prev.availableSources.find(s => s.id === sourceId)
      if (!newSource) return prev
      
      return {
        ...prev,
        currentSource: newSource,
        isBuffering: true,
        hlsReady: false,
      }
    })
    
    // Simulate source switch buffering
    setTimeout(() => {
      setState(prev => ({ ...prev, isBuffering: false, hlsReady: true }))
    }, 600)
  }, [])

  const setIsPlaying = useCallback((playing: boolean) => {
    setState(prev => ({ ...prev, isPlaying: playing }))
  }, [])

  const setIsBuffering = useCallback((buffering: boolean) => {
    setState(prev => ({ ...prev, isBuffering: buffering }))
  }, [])

  return (
    <StreamingContext.Provider value={{
      ...state,
      setActiveProvider,
      toggleProvider,
      playEpisode,
      switchSource,
      setIsPlaying,
      setIsBuffering,
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
