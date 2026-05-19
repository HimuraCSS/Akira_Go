"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

// ============================================================================
// MYANIMELIST AUTH CONTEXT
// Uses OAuth2 with PKCE for secure authentication
// ============================================================================

interface MALUser {
  id: number
  name: string
  picture: string | null
  gender: string | null
  location: string | null
  joined_at: string
  anime_statistics?: {
    num_items_watching: number
    num_items_completed: number
    num_items_on_hold: number
    num_items_dropped: number
    num_items_plan_to_watch: number
    num_episodes: number
    mean_score: number
  }
}

interface MALAnimeListItem {
  node: {
    id: number
    title: string
    main_picture?: {
      medium: string
      large: string
    }
    synopsis?: string
    mean?: number
    num_episodes?: number
    status?: string
    genres?: { id: number; name: string }[]
    studios?: { id: number; name: string }[]
    start_season?: { year: number; season: string }
  }
  list_status: {
    status: "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch"
    score: number
    num_episodes_watched: number
    is_rewatching: boolean
    updated_at: string
  }
}

interface MALAuthContextType {
  user: MALUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  animeList: MALAnimeListItem[]
  isLoadingList: boolean
  login: () => void
  logout: () => void
  refreshUserData: () => Promise<void>
  fetchAnimeList: (status?: string) => Promise<void>
  updateAnimeStatus: (animeId: number, status: string, episodesWatched?: number, score?: number) => Promise<void>
  clearError: () => void
}

const MALAuthContext = createContext<MALAuthContextType | null>(null)

// PKCE Helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: "mal_access_token",
  REFRESH_TOKEN: "mal_refresh_token",
  TOKEN_EXPIRES: "mal_token_expires",
  CODE_VERIFIER: "mal_code_verifier",
  USER: "mal_user",
} as const

export function MALAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MALUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [animeList, setAnimeList] = useState<MALAnimeListItem[]>([])
  const [isLoadingList, setIsLoadingList] = useState(false)

  const isAuthenticated = !!user

  const clearError = useCallback(() => setError(null), [])

  // Logout function - defined early for use in other functions
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES)
    localStorage.removeItem(STORAGE_KEYS.USER)
    setUser(null)
    setAnimeList([])
  }, [])

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      if (!refreshTokenValue) throw new Error("No refresh token")

      const response = await fetch("/api/auth/mal/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      })

      if (!response.ok) throw new Error("Failed to refresh token")

      const data = await response.json()
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token)
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, String(Date.now() + data.expires_in * 1000))

      return data.access_token
    } catch (error) {
      console.error("[v0] Token refresh error:", error)
      logout()
      throw error
    }
  }, [logout])

  // Refresh user data function
  const refreshUserData = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      if (!accessToken) throw new Error("Not authenticated")

      const response = await fetch("/api/auth/mal/user", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        if (response.status === 401) {
          await refreshToken()
          return refreshUserData()
        }
        throw new Error("Failed to fetch user data")
      }

      const userData = await response.json()
      setUser(userData)
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
    } catch (error) {
      console.error("[v0] Error fetching user data:", error)
      throw error
    }
  }, [refreshToken])

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER)
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
        const tokenExpires = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES)

        if (storedUser && accessToken) {
          // Check if token is expired
          if (tokenExpires && Date.now() > parseInt(tokenExpires)) {
            // Try to refresh token
            await refreshToken()
            await refreshUserData()
          } else {
            setUser(JSON.parse(storedUser))
          }
        }
      } catch (error) {
        console.error("[v0] Error checking auth:", error)
        logout()
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [logout, refreshToken, refreshUserData])

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get("code")
      const state = urlParams.get("state")
      const errorParam = urlParams.get("error")

      // Handle error from MAL
      if (errorParam) {
        const errorDescription = urlParams.get("error_description") || "Erro desconhecido"
        console.error("[v0] OAuth error:", errorParam, errorDescription)
        setError(`Erro de autenticacao: ${errorDescription}`)
        window.history.replaceState({}, document.title, window.location.pathname)
        setIsLoading(false)
        return
      }

      if (code && state === "mal_auth") {
        try {
          setIsLoading(true)
          setError(null)
          
          const codeVerifier = localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER)
          
          if (!codeVerifier) {
            throw new Error("Code verifier not found. Please try logging in again.")
          }

          console.log("[v0] Exchanging code for token...")

          // Exchange code for token
          const response = await fetch("/api/auth/mal/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, codeVerifier }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error("[v0] Token exchange failed:", errorData)
            throw new Error(errorData.error || "Failed to exchange code for token")
          }

          const data = await response.json()
          console.log("[v0] Token received successfully")
          
          // Store tokens
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token)
          localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, String(Date.now() + data.expires_in * 1000))

          // Fetch user data
          await refreshUserData()

          console.log("[v0] User authenticated successfully")

          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname)
        } catch (error) {
          console.error("[v0] OAuth callback error:", error)
          setError(error instanceof Error ? error.message : "Erro ao fazer login")
        } finally {
          setIsLoading(false)
          localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER)
        }
      }
    }

    handleCallback()
  }, [refreshUserData])

  const login = useCallback(async () => {
    try {
      setError(null)
      const clientId = process.env.NEXT_PUBLIC_MAL_CLIENT_ID
      
      if (!clientId) {
        setError("Credenciais do MyAnimeList nao configuradas. Entre em contato com o administrador.")
        console.error("[v0] MAL_CLIENT_ID not configured")
        return
      }

      console.log("[v0] Starting OAuth flow...")

      const codeVerifier = generateCodeVerifier()
      const codeChallenge = await generateCodeChallenge(codeVerifier)
      
      localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier)

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const redirectUri = `${appUrl}/api/auth/mal/callback`
      
      console.log("[v0] Redirect URI:", redirectUri)
      
      const authUrl = new URL("https://myanimelist.net/v1/oauth2/authorize")
      authUrl.searchParams.set("response_type", "code")
      authUrl.searchParams.set("client_id", clientId)
      authUrl.searchParams.set("redirect_uri", redirectUri)
      authUrl.searchParams.set("code_challenge", codeChallenge)
      authUrl.searchParams.set("code_challenge_method", "S256")
      authUrl.searchParams.set("state", "mal_auth")

      window.location.href = authUrl.toString()
    } catch (error) {
      console.error("[v0] Login error:", error)
      setError("Erro ao iniciar login. Tente novamente.")
    }
  }, [])

  const fetchAnimeList = useCallback(async (status?: string) => {
    try {
      setIsLoadingList(true)
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      if (!accessToken) throw new Error("Not authenticated")

      const url = new URL("/api/auth/mal/animelist", window.location.origin)
      if (status) url.searchParams.set("status", status)
      url.searchParams.set("fields", "list_status,synopsis,mean,num_episodes,status,genres,studios,start_season")
      url.searchParams.set("limit", "100")

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        if (response.status === 401) {
          await refreshToken()
          return fetchAnimeList(status)
        }
        throw new Error("Failed to fetch anime list")
      }

      const data = await response.json()
      setAnimeList(data.data || [])
    } catch (error) {
      console.error("[v0] Error fetching anime list:", error)
    } finally {
      setIsLoadingList(false)
    }
  }, [refreshToken])

  const updateAnimeStatus = useCallback(async (
    animeId: number, 
    status: string, 
    episodesWatched?: number,
    score?: number
  ) => {
    try {
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      if (!accessToken) throw new Error("Not authenticated")

      const response = await fetch(`/api/auth/mal/animelist/${animeId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, num_watched_episodes: episodesWatched, score }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          await refreshToken()
          return updateAnimeStatus(animeId, status, episodesWatched, score)
        }
        throw new Error("Failed to update anime status")
      }

      // Refresh list after update
      await fetchAnimeList()
    } catch (error) {
      console.error("[v0] Error updating anime status:", error)
      throw error
    }
  }, [fetchAnimeList, refreshToken])

  return (
    <MALAuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        animeList,
        isLoadingList,
        login,
        logout,
        refreshUserData,
        fetchAnimeList,
        updateAnimeStatus,
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
