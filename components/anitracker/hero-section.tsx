"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Play, Settings, ChevronLeft, ChevronRight, Star, Calendar, Clock, Tv } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useStreaming } from "./streaming-context"
import type { AnimeData } from "./anime-card"

interface HeroAnime extends AnimeData {
  bannerImage?: string
}

interface HeroSectionProps {
  anime?: AnimeData
  isLoading?: boolean
  onOpenAddons: () => void
  onWatchNow: () => void
}

export function HeroSection({ onOpenAddons, onWatchNow }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [animes, setAnimes] = useState<HeroAnime[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const { loadAnimeEpisodes, playEpisode, providers, activeProvider, isBuffering, isLoadingEpisodes, isLoadingStream } = useStreaming()

  const activeProviderData = providers.find(p => p.id === activeProvider)
  const activeSources = providers.filter(p => p.enabled && p.status !== "offline").length
  const isStreamLoading = isBuffering || isLoadingEpisodes || isLoadingStream

  // Fetch top airing anime from current season
  useEffect(() => {
    async function fetchSeasonalAnime() {
      try {
        setIsLoading(true)
        
        // Fetch top airing anime (most popular currently airing)
        const response = await fetch(
          `https://api.jikan.moe/v4/top/anime?filter=airing&sfw=true&limit=8`
        )
        
        if (!response.ok) throw new Error("Failed to fetch")
        
        const data = await response.json()
        
        // For each anime, try to get better banner from full details
        const animesWithBanners: HeroAnime[] = []
        
        for (const anime of data.data.slice(0, 6)) {
          // Use trailer thumbnail for HD banner (maxresdefault)
          let bannerImage = anime.images?.jpg?.large_image_url
          
          if (anime.trailer?.youtube_id) {
            // YouTube maxresdefault gives highest quality
            bannerImage = `https://img.youtube.com/vi/${anime.trailer.youtube_id}/maxresdefault.jpg`
          } else if (anime.trailer?.images?.maximum_image_url) {
            bannerImage = anime.trailer.images.maximum_image_url
          }
          
          animesWithBanners.push({
            id: anime.mal_id.toString(),
            title: anime.title,
            image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
            bannerImage,
            score: anime.score || 0,
            episodes: anime.episodes || 0,
            status: anime.status || "Em exibicao",
            synopsis: anime.synopsis || "",
            genres: anime.genres?.map((g: any) => g.name) || [],
            year: anime.year || new Date().getFullYear(),
            studio: anime.studios?.[0]?.name || "",
            studios: anime.studios?.map((s: any) => s.name) || [],
            duration: anime.duration?.replace(" per ep", "") || "",
            rating: anime.rating || "",
            popularity: anime.popularity || 0,
            members: anime.members || 0,
          })
        }
        
        setAnimes(animesWithBanners.filter(a => a.score > 0))
      } catch (error) {
        console.error("Failed to fetch seasonal anime:", error)
        setAnimes([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSeasonalAnime()
  }, [])

  // Auto-rotate carousel every 8 seconds
  useEffect(() => {
    if (animes.length <= 1 || isPaused) return
    
    const interval = setInterval(() => {
      handleTransition((prev) => (prev + 1) % animes.length)
    }, 8000)
    
    return () => clearInterval(interval)
  }, [animes.length, isPaused])

  const handleTransition = (getNewIndex: (prev: number) => number) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(getNewIndex)
      setTimeout(() => setIsTransitioning(false), 50)
    }, 300)
  }

  const goToPrevious = useCallback(() => {
    handleTransition((prev) => (prev - 1 + animes.length) % animes.length)
  }, [animes.length])

  const goToNext = useCallback(() => {
    handleTransition((prev) => (prev + 1) % animes.length)
  }, [animes.length])

  const goToSlide = useCallback((index: number) => {
    if (index !== currentIndex) {
      handleTransition(() => index)
    }
  }, [currentIndex])

  const handleWatchNow = useCallback(async () => {
    const currentAnime = animes[currentIndex]
    if (!currentAnime) return
    
    try {
      // Load anime episodes for the current hero anime
      await loadAnimeEpisodes(currentAnime.id, currentAnime.title, currentAnime.image)
      
      // Small delay to ensure episodes are loaded
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Play first episode
      const firstEpisode = {
        id: `${currentAnime.id}-ep-1`,
        number: 1,
        title: "Episodio 1",
        thumbnail: currentAnime.image,
        duration: currentAnime.duration || "24:00",
        animeId: currentAnime.id,
        animeTitle: currentAnime.title,
      }
      
      await playEpisode(firstEpisode)
      
      // Scroll to player section after a brief delay
      setTimeout(() => {
        const playerSection = document.querySelector('[data-player-section]') || 
                            document.querySelector('section.py-6') ||
                            document.querySelector('[class*="artplayer"]')?.closest('section')
        if (playerSection) {
          playerSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
          // Fallback: scroll down by viewport height
          window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' })
        }
      }, 200)
      
      onWatchNow()
    } catch (error) {
      console.error("Failed to start playback:", error)
    }
  }, [animes, currentIndex, loadAnimeEpisodes, playEpisode, onWatchNow])

  const currentAnime = animes[currentIndex]

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="relative w-full h-[70vh] min-h-[500px] overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="max-w-2xl space-y-6">
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-6 w-20 bg-secondary/50 rounded animate-pulse" />
                ))}
              </div>
              <div className="space-y-4">
                <div className="h-14 w-96 bg-secondary/50 rounded animate-pulse" />
                <div className="h-14 w-72 bg-secondary/50 rounded animate-pulse" />
              </div>
              <div className="h-4 w-48 bg-secondary/50 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-secondary/50 rounded animate-pulse" />
                <div className="h-4 w-4/5 bg-secondary/50 rounded animate-pulse" />
              </div>
              <div className="flex gap-4 pt-4">
                <div className="h-14 w-40 bg-secondary/50 rounded animate-pulse" />
                <div className="h-14 w-48 bg-secondary/50 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!currentAnime) {
    return null
  }

  // Split title for styling (first 2-3 words highlighted)
  const titleWords = currentAnime.title.split(" ")
  const highlightWords = titleWords.slice(0, Math.min(2, Math.ceil(titleWords.length / 2))).join(" ")
  const remainingWords = titleWords.slice(Math.min(2, Math.ceil(titleWords.length / 2))).join(" ")

  return (
    <section 
      className="relative w-full h-[70vh] min-h-[500px] overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Images - Preload all for smooth transitions */}
      <div className="absolute inset-0">
        {animes.map((anime, index) => (
          <div
            key={anime.id}
            className={cn(
              "absolute inset-0 transition-all duration-700 ease-in-out",
              index === currentIndex && !isTransitioning
                ? "opacity-100 scale-100" 
                : "opacity-0 scale-105"
            )}
          >
            <Image
              src={anime.bannerImage || anime.image}
              alt={anime.title}
              fill
              priority={index === 0}
              loading={index < 2 ? "eager" : "lazy"}
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>
        ))}
        
        {/* Gradient Overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
      </div>

      {/* Content */}
      <div 
        className={cn(
          "relative z-10 h-full flex items-center transition-all duration-300",
          isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        )}
      >
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-2xl space-y-5">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/90 text-primary-foreground font-semibold gap-1 backdrop-blur-sm">
                <Star className="w-3 h-3 fill-current" />
                {currentAnime.score.toFixed(1)} Score
              </Badge>
              <Badge variant="outline" className="border-border/50 bg-background/30 backdrop-blur-sm text-foreground gap-1">
                <Calendar className="w-3 h-3" />
                {currentAnime.year}
              </Badge>
              <Badge variant="outline" className="border-border/50 bg-background/30 backdrop-blur-sm text-foreground">
                {currentAnime.status === "Currently Airing" ? "Em lancamento" : currentAnime.status}
              </Badge>
              {currentAnime.duration && (
                <Badge variant="outline" className="border-border/50 bg-background/30 backdrop-blur-sm text-foreground gap-1">
                  <Clock className="w-3 h-3" />
                  {currentAnime.duration}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none">
              <span className="gradient-text">{highlightWords}</span>
              {remainingWords && (
                <>
                  <br />
                  <span className="text-foreground">{remainingWords}</span>
                </>
              )}
            </h1>

            {/* Studio and Genres */}
            <p className="text-muted-foreground text-sm uppercase tracking-widest">
              {currentAnime.studio}
              {currentAnime.genres.length > 0 && (
                <span> • {currentAnime.genres.slice(0, 3).join(", ")}</span>
              )}
            </p>

            {/* Synopsis */}
            <p className="text-foreground/80 text-base leading-relaxed max-w-xl line-clamp-3">
              {currentAnime.synopsis || "Sem sinopse disponivel."}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              <Button 
                size="lg" 
                className="glow-effect bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-lg shadow-lg shadow-primary/25"
                onClick={handleWatchNow}
                disabled={isStreamLoading}
              >
                {isStreamLoading ? (
                  <>
                    <div className="w-5 h-5 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2 fill-current" />
                    Assistir Agora
                  </>
                )}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-border/50 hover:border-primary/50 hover:bg-primary/10 px-8 py-6 text-lg backdrop-blur-sm"
                onClick={onOpenAddons}
              >
                <Settings className="w-5 h-5 mr-2" />
                Gerenciar Add-ons
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6 pt-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  activeSources > 0 ? "bg-green-500 animate-pulse" : "bg-destructive"
                )} />
                <span className="text-muted-foreground">{activeSources} Fontes Ativas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  {activeProviderData ? activeProviderData.name : "Nenhum Provedor"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows - Show on hover */}
      {animes.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/50 backdrop-blur-sm border border-border/50 text-foreground hover:bg-background/80 hover:border-primary/50 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Anime anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/50 backdrop-blur-sm border border-border/50 text-foreground hover:bg-background/80 hover:border-primary/50 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Proximo anime"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Slide Indicators */}
      {animes.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {animes.map((anime, index) => (
            <button
              key={anime.id}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500 backdrop-blur-sm",
                index === currentIndex 
                  ? "w-10 bg-primary shadow-lg shadow-primary/50" 
                  : "w-2 bg-foreground/40 hover:bg-foreground/60"
              )}
              aria-label={`Ver ${anime.title}`}
              title={anime.title}
            />
          ))}
        </div>
      )}

      {/* Progress Bar - Auto advance indicator */}
      {animes.length > 1 && !isPaused && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-foreground/10 z-20">
          <div 
            key={currentIndex}
            className="h-full bg-primary/80 animate-progress"
          />
        </div>
      )}

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress {
          animation: progress 8s linear;
        }
      `}</style>
    </section>
  )
}
