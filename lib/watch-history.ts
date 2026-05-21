// Watch History utility for "Continue Watching" feature
// Stores watch progress in localStorage

export interface WatchHistoryItem {
  animeId: number
  animeTitle: string
  animeImage: string
  episodeNumber: number
  totalEpisodes: number
  progress: number // 0-100 percentage
  timestamp: number // Last watched timestamp
  duration?: number // Episode duration in seconds
}

const STORAGE_KEY = "akira-go-watch-history"
const MAX_HISTORY_ITEMS = 20

// Get all watch history
export function getWatchHistory(): WatchHistoryItem[] {
  if (typeof window === "undefined") return []
  
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    
    const history: WatchHistoryItem[] = JSON.parse(data)
    // Sort by most recent
    return history.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

// Add or update watch history item
export function updateWatchHistory(item: Omit<WatchHistoryItem, "timestamp">): void {
  if (typeof window === "undefined") return
  
  try {
    const history = getWatchHistory()
    
    // Find existing item for this anime
    const existingIndex = history.findIndex(h => h.animeId === item.animeId)
    
    const newItem: WatchHistoryItem = {
      ...item,
      timestamp: Date.now(),
    }
    
    if (existingIndex >= 0) {
      // Update existing
      history[existingIndex] = newItem
    } else {
      // Add new
      history.unshift(newItem)
    }
    
    // Keep only MAX_HISTORY_ITEMS
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory))
  } catch {
    // Silently fail
  }
}

// Remove item from history
export function removeFromWatchHistory(animeId: number): void {
  if (typeof window === "undefined") return
  
  try {
    const history = getWatchHistory()
    const filtered = history.filter(h => h.animeId !== animeId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch {
    // Silently fail
  }
}

// Get specific anime's watch progress
export function getAnimeProgress(animeId: number): WatchHistoryItem | null {
  const history = getWatchHistory()
  return history.find(h => h.animeId === animeId) || null
}

// Clear all watch history
export function clearWatchHistory(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}

// Format time ago for display
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  
  if (seconds < 60) return "Agora mesmo"
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min atrás`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} dias atrás`
  
  return new Date(timestamp).toLocaleDateString("pt-BR")
}
