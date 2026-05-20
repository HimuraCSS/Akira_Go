"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { 
  fetchMALUserProfile, 
  fetchMALUserAnimeList, 
  fetchMALUserStatistics,
  fetchMALUserHistory,
  type MALUserProfile,
  type MALUserAnimeEntry
} from "@/lib/jikan-api"

// ============================================================================
// MYANIMELIST SYNC CONTEXT
// Uses Jikan API (public) - No OAuth required, just username
// ============================================================================

interface MALUser {
  id: number
  username: string
  avatar: string | null
  location: string | null
  joined: string
  statistics: {
    watching: number
    completed: number
    on_hold: number
    dropped: number
    plan_to_watch: number
    total_entries: number
    episodes_watched: number
    days_watched: number
    mean_score: number
  }
}

interface MALAnimeListItem {
  mal_id: number
  title: string
  image: string
  score: number
  userScore: number
  episodesWatched: number
  totalEpisodes: number | null
  status: string
  year: number | null
}

interface MALAuthContextType {
  user: MALUser | null
  isConnected: boolean
  isLoading: boolean
  error: string | null
  animeList: MALAnimeListItem[]
  isLoadingList: boolean
  connect: (username: string) => Promise<boolean>
  disconnect: () => void
  refreshUserData: () => Promise<void>
  fetchAnimeList: (status?: "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch") => Promise<void>
  clearError: () => void
}

const MALAuthContext = createContext<MALAuthContextType | null>(null)

// Storage keys
const STORAGE_KEYS = {
  USERNAME: "mal_username",
  USER: "mal_user",
} as const

export function MALAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MALUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [animeList, setAnimeList] = useState<MALAnimeListItem[]>([])
  const [isLoadingList, setIsLoadingList] = useState(false)

  // Load saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER)
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEYS.USER)
      }
    }
    setIsLoading(false)
  }, [])

  // Transform Jikan profile to our format
  const transformProfile = (profile: MALUserProfile): MALUser => ({
    id: profile.mal_id,
    username: profile.username,
    avatar: profile.images?.jpg?.image_url || null,
    location: profile.location,
    joined: profile.joined,
    statistics: {
      watching: profile.statistics?.anime?.watching || 0,
      completed: profile.statistics?.anime?.completed || 0,
      on_hold: profile.statistics?.anime?.on_hold || 0,
      dropped: profile.statistics?.anime?.dropped || 0,
      plan_to_watch: profile.statistics?.anime?.plan_to_watch || 0,
      total_entries: profile.statistics?.anime?.total_entries || 0,
      episodes_watched: profile.statistics?.anime?.episodes_watched || 0,
      days_watched: profile.statistics?.anime?.days_watched || 0,
      mean_score: profile.statistics?.anime?.mean_score || 0,
    }
  })

  // Transform anime list entry
  const transformAnimeEntry = (entry: MALUserAnimeEntry): MALAnimeListItem => ({
    mal_id: entry.entry.mal_id,
    title: entry.entry.title,
    image: entry.entry.images?.jpg?.large_image_url || entry.entry.images?.jpg?.image_url || "",
    score: entry.entry.score || 0,
    userScore: entry.score,
    episodesWatched: entry.episodes_watched,
    totalEpisodes: entry.entry.episodes,
    status: entry.entry.status,
    year: entry.entry.year,
  })

  // Connect with username
  const connect = useCallback(async (username: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const profile = await fetchMALUserProfile(username)
      
      if (!profile) {
        setError(`Usuario "${username}" nao encontrado no MyAnimeList`)
        setIsLoading(false)
        return false
      }

      const malUser = transformProfile(profile)
      setUser(malUser)
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.USERNAME, username)
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(malUser))
      
      setIsLoading(false)
      return true
    } catch (err) {
      console.error("Failed to connect to MAL:", err)
      setError("Erro ao conectar com o MyAnimeList")
      setIsLoading(false)
      return false
    }
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    setUser(null)
    setAnimeList([])
    localStorage.removeItem(STORAGE_KEYS.USERNAME)
    localStorage.removeItem(STORAGE_KEYS.USER)
  }, [])

  // Refresh user data
  const refreshUserData = useCallback(async () => {
    const username = localStorage.getItem(STORAGE_KEYS.USERNAME)
    if (!username) return

    setIsLoading(true)
    try {
      const profile = await fetchMALUserProfile(username)
      if (profile) {
        const malUser = transformProfile(profile)
        setUser(malUser)
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(malUser))
      }
    } catch (err) {
      console.error("Failed to refresh user data:", err)
    }
    setIsLoading(false)
  }, [])

  // Fetch anime list
  const fetchAnimeListFn = useCallback(async (
    status?: "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch"
  ) => {
    const username = localStorage.getItem(STORAGE_KEYS.USERNAME)
    if (!username) return

    setIsLoadingList(true)
    try {
      const result = await fetchMALUserAnimeList(username, status)
      const transformed = result.data.map(transformAnimeEntry)
      setAnimeList(transformed)
    } catch (err) {
      console.error("Failed to fetch anime list:", err)
      setError("Erro ao buscar lista de animes")
    }
    setIsLoadingList(false)
  }, [])

  // Clear error
  const clearError = useCallback(() => setError(null), [])

  return (
    <MALAuthContext.Provider
      value={{
        user,
        isConnected: !!user,
        isLoading,
        error,
        animeList,
        isLoadingList,
        connect,
        disconnect,
        refreshUserData,
        fetchAnimeList: fetchAnimeListFn,
        clearError,
      }}
    >
      {children}
    </MALAuthContext.Provider>
  )
}

export function useMALAuth() {
  const context = useContext(MALAuthContext)
  if (!context) {
    throw new Error("useMALAuth must be used within a MALAuthProvider")
  }
  return context
}

export type { MALUser, MALAnimeListItem }
