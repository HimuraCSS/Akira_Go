"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User, Session } from "@supabase/supabase-js"

interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  mal_username: string | null
  created_at: string
  updated_at: string
}

interface WatchHistoryEntry {
  id: string
  anime_id: string
  anime_title: string
  poster_url: string | null
  episode_number: number
  episode_id: string | null
  watched_at: string
  progress_seconds: number
  duration_seconds: number
  completed: boolean
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isGuest: boolean
  setGuestMode: (isGuest: boolean) => void
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
  getWatchHistory: () => Promise<WatchHistoryEntry[]>
  saveWatchProgress: (entry: Omit<WatchHistoryEntry, "id" | "watched_at">) => Promise<void>
  getContinueWatching: () => Promise<WatchHistoryEntry[]>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  const supabase = createClient()

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (!error && data) {
      setProfile(data)
    }
  }, [supabase])

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        }

        // Check for guest mode in localStorage
        const guestMode = localStorage.getItem("akira_guest_mode")
        if (guestMode === "true" && !session) {
          setIsGuest(true)
        }
      } catch (error) {
        console.error("Auth init error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
          setIsGuest(false)
          localStorage.removeItem("akira_guest_mode")
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const setGuestMode = (guest: boolean) => {
    setIsGuest(guest)
    if (guest) {
      localStorage.setItem("akira_guest_mode", "true")
    } else {
      localStorage.removeItem("akira_guest_mode")
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? 
          `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? 
          `${window.location.origin}/auth/callback`,
        data: {
          display_name: displayName,
        },
      },
    })
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") }

    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id)

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null)
    }

    return { error: error ? new Error(error.message) : null }
  }

  const getWatchHistory = async (): Promise<WatchHistoryEntry[]> => {
    if (!user) {
      // Return from localStorage for guests
      const stored = localStorage.getItem("akira_watch_history")
      return stored ? JSON.parse(stored) : []
    }

    const { data, error } = await supabase
      .from("watch_history")
      .select("*")
      .eq("user_id", user.id)
      .order("watched_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch watch history:", error)
      return []
    }

    return data || []
  }

  const saveWatchProgress = async (entry: Omit<WatchHistoryEntry, "id" | "watched_at">) => {
    if (!user) {
      // Save to localStorage for guests
      const stored = localStorage.getItem("akira_watch_history")
      const history: WatchHistoryEntry[] = stored ? JSON.parse(stored) : []
      
      const existingIndex = history.findIndex(
        h => h.anime_id === entry.anime_id && h.episode_number === entry.episode_number
      )
      
      const newEntry: WatchHistoryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        watched_at: new Date().toISOString(),
      }
      
      if (existingIndex >= 0) {
        history[existingIndex] = newEntry
      } else {
        history.unshift(newEntry)
      }
      
      // Keep only last 50 entries
      localStorage.setItem("akira_watch_history", JSON.stringify(history.slice(0, 50)))
      return
    }

    const { error } = await supabase
      .from("watch_history")
      .upsert({
        user_id: user.id,
        anime_id: entry.anime_id,
        anime_title: entry.anime_title,
        poster_url: entry.poster_url,
        episode_number: entry.episode_number,
        episode_id: entry.episode_id,
        progress_seconds: entry.progress_seconds,
        duration_seconds: entry.duration_seconds,
        completed: entry.completed,
        watched_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,anime_id,episode_number",
      })

    if (error) {
      console.error("Failed to save watch progress:", error)
    }
  }

  const getContinueWatching = async (): Promise<WatchHistoryEntry[]> => {
    const history = await getWatchHistory()
    
    // Group by anime and get the latest episode for each
    const animeMap = new Map<string, WatchHistoryEntry>()
    
    for (const entry of history) {
      const existing = animeMap.get(entry.anime_id)
      if (!existing || new Date(entry.watched_at) > new Date(existing.watched_at)) {
        // Only include if not completed or progress is less than 90%
        if (!entry.completed && (entry.progress_seconds / entry.duration_seconds) < 0.9) {
          animeMap.set(entry.anime_id, entry)
        }
      }
    }
    
    return Array.from(animeMap.values()).slice(0, 10)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isGuest,
        setGuestMode,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
        getWatchHistory,
        saveWatchProgress,
        getContinueWatching,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
