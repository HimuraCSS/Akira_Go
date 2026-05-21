"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Play, X, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  getWatchHistory, 
  removeFromWatchHistory, 
  formatTimeAgo,
  type WatchHistoryItem 
} from "@/lib/watch-history"
import { cn } from "@/lib/utils"

export function ContinueWatching() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadHistory = () => {
      const data = getWatchHistory()
      setHistory(data)
      setIsLoading(false)
    }
    
    loadHistory()
    
    // Listen for storage changes from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "akira-go-watch-history") {
        loadHistory()
      }
    }
    
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const handleRemove = (animeId: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    removeFromWatchHistory(animeId)
    setHistory(prev => prev.filter(h => h.animeId !== animeId))
  }

  if (isLoading) {
    return (
      <section className="py-6">
        <div className="flex items-center gap-3 mb-4 px-4 lg:px-0">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h2 className="text-xl font-bold">Continue Assistindo</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 px-4 lg:px-0">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-72 h-40 bg-card/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    )
  }

  if (history.length === 0) {
    return null // Don't show section if no history
  }

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4 px-4 lg:px-0">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <h2 className="text-xl font-bold">Continue Assistindo</h2>
          <span className="text-sm text-muted-foreground">({history.length})</span>
        </div>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 px-4 lg:px-0 scrollbar-hide">
        {history.map((item) => (
          <Link
            key={item.animeId}
            href={`/assistir/${item.animeId}/${item.episodeNumber}`}
            className="flex-shrink-0 group"
          >
            <div className="relative w-72 rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10">
              {/* Thumbnail with overlay */}
              <div className="relative aspect-video">
                <Image
                  src={item.animeImage}
                  alt={item.animeTitle}
                  fill
                  className="object-cover"
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-current text-primary-foreground ml-1" />
                  </div>
                </div>
                
                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleRemove(item.animeId, e)}
                >
                  <X className="w-4 h-4" />
                </Button>
                
                {/* Episode badge */}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-1 rounded-md bg-primary/90 text-xs font-medium">
                    EP {item.episodeNumber}
                  </span>
                </div>
                
                {/* Info at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-semibold text-sm line-clamp-1 text-white mb-1">
                    {item.animeTitle}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(item.timestamp)}</span>
                    <span className="text-white/40">•</span>
                    <span>Ep {item.episodeNumber}/{item.totalEpisodes || "?"}</span>
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="px-3 py-2 bg-card">
                <Progress 
                  value={item.progress} 
                  className="h-1.5 bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {item.progress}% assistido
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
