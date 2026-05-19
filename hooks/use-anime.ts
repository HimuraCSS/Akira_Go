"use client"

import useSWR from "swr"
import useSWRImmutable from "swr/immutable"
import type { AnimeData } from "@/components/anitracker/anime-card"
import {
  fetchTopAnime,
  fetchAiringAnime,
  fetchUpcomingAnime,
  fetchPopularAnime,
  searchAnime,
  fetchAnimeById,
  fetchAnimeRecommendations,
} from "@/lib/jikan-api"

// SWR configuration for anime data
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 1 minute
  errorRetryCount: 2,
}

/**
 * Hook for fetching top rated anime (currently airing)
 */
export function useTopAnime(limit: number = 25) {
  const { data, error, isLoading, mutate } = useSWR<AnimeData[]>(
    `top-anime-${limit}`,
    () => fetchTopAnime(limit),
    swrConfig
  )

  return {
    animes: data || [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Hook for fetching currently airing anime (seasonal)
 */
export function useAiringAnime(limit: number = 25) {
  const { data, error, isLoading, mutate } = useSWR<AnimeData[]>(
    `airing-anime-${limit}`,
    () => fetchAiringAnime(limit),
    swrConfig
  )

  return {
    animes: data || [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Hook for fetching upcoming anime
 */
export function useUpcomingAnime(limit: number = 25) {
  const { data, error, isLoading, mutate } = useSWR<AnimeData[]>(
    `upcoming-anime-${limit}`,
    () => fetchUpcomingAnime(limit),
    swrConfig
  )

  return {
    animes: data || [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Hook for fetching popular anime (by members)
 */
export function usePopularAnime(limit: number = 25) {
  const { data, error, isLoading, mutate } = useSWR<AnimeData[]>(
    `popular-anime-${limit}`,
    () => fetchPopularAnime(limit),
    swrConfig
  )

  return {
    animes: data || [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Hook for searching anime
 */
export function useAnimeSearch(query: string, limit: number = 25) {
  const { data, error, isLoading, mutate } = useSWR<AnimeData[]>(
    query ? `search-anime-${query}-${limit}` : null,
    () => searchAnime(query, limit),
    {
      ...swrConfig,
      dedupingInterval: 30000, // 30 seconds for search
    }
  )

  return {
    results: data || [],
    isLoading: query ? isLoading : false,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Hook for fetching anime details by ID (immutable - rarely changes)
 */
export function useAnimeDetails(id: string | number | null) {
  const { data, error, isLoading } = useSWRImmutable<AnimeData | null>(
    id ? `anime-details-${id}` : null,
    () => (id ? fetchAnimeById(id) : Promise.resolve(null))
  )

  return {
    anime: data,
    isLoading,
    isError: !!error,
    error,
  }
}

/**
 * Hook for fetching anime recommendations
 */
export function useAnimeRecommendations(id: string | number | null, limit: number = 10) {
  const { data, error, isLoading } = useSWR<AnimeData[]>(
    id ? `anime-recommendations-${id}-${limit}` : null,
    () => (id ? fetchAnimeRecommendations(id, limit) : Promise.resolve([])),
    swrConfig
  )

  return {
    recommendations: data || [],
    isLoading,
    isError: !!error,
    error,
  }
}

/**
 * Hook for featured anime (first from top anime)
 */
export function useFeaturedAnime() {
  const { animes, isLoading, isError } = useTopAnime(1)
  
  return {
    anime: animes[0] || null,
    isLoading,
    isError,
  }
}

/**
 * Combined hook for dashboard data - fetches all sections in parallel
 */
export function useDashboardData() {
  const topAnime = useTopAnime(12)
  const airingAnime = useAiringAnime(12)
  const popularAnime = usePopularAnime(12)
  const upcomingAnime = useUpcomingAnime(12)

  const isLoading = topAnime.isLoading || airingAnime.isLoading || popularAnime.isLoading
  const isError = topAnime.isError || airingAnime.isError || popularAnime.isError

  return {
    featured: topAnime.animes[0] || null,
    trending: topAnime.animes,
    airing: airingAnime.animes,
    popular: popularAnime.animes,
    upcoming: upcomingAnime.animes,
    isLoading,
    isError,
    refresh: () => {
      topAnime.refresh()
      airingAnime.refresh()
      popularAnime.refresh()
      upcomingAnime.refresh()
    },
  }
}
