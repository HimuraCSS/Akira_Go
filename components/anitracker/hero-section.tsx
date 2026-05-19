"use client"

import Image from "next/image"
import { Play, Settings, Star, Calendar, Tv, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useStreaming } from "./streaming-context"
import type { AnimeData } from "./anime-card"

interface HeroSectionProps {
  anime?: AnimeData
  isLoading?: boolean
  onOpenAddons: () => void
  onWatchNow: () => void
}

// Default featured anime data
const defaultFeaturedAnime: AnimeData = {
  id: "cyberpunk-edgerunners",
  title: "Cyberpunk: Edgerunners",
  japaneseTitle: "サイバーパンク エッジランナーズ",
  image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80",
  bannerImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80",
  score: 9.1,
  episodes: 10,
  status: "Completed",
  synopsis: "Em uma distopia dominada por corporações e obsessão por tecnologia, um jovem delinquente de rua tenta sobreviver em Night City, uma cidade que vive da modificação corporal.",
  genres: ["Ação", "Sci-Fi", "Cyberpunk"],
  year: 2022,
  studio: "Studio Trigger",
  duration: "24min/ep",
}

export function HeroSection({ anime, isLoading = false, onOpenAddons, onWatchNow }: HeroSectionProps) {
  const { loadAnimeEpisodes, playEpisode, providers, activeProvider, isBuffering, isLoadingEpisodes, isLoadingStream } = useStreaming()

  const activeProviderData = providers.find(p => p.id === activeProvider)
  const activeSources = providers.filter(p => p.enabled && p.status !== "offline").length

  // Use provided anime or fallback to default
  const displayAnime = anime ?? defaultFeaturedAnime

  const isStreamLoading = isBuffering || isLoadingEpisodes || isLoadingStream

  const handleWatchNow = async () => {
    // First load episodes for this anime
    await loadAnimeEpisodes(
      displayAnime.id, 
      displayAnime.title,
      displayAnime.image
    )
    
    // Then play the first episode
    const episode = {
      id: `${displayAnime.id}-ep-1`,
      number: 1,
      title: "Episódio 1",
      thumbnail: displayAnime.image,
      duration: displayAnime.duration || "24:00",
      animeId: displayAnime.id,
      animeTitle: displayAnime.title,
    }
    
    await playEpisode(episode)
    onWatchNow()
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
        <div className="absolute inset-0 bg-secondary/20 animate-pulse" />
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="max-w-2xl space-y-6">
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-6 w-20 bg-secondary/50 rounded animate-pulse" />
                ))}
              </div>
              <div className="space-y-4">
                <div className="h-16 w-80 bg-secondary/50 rounded animate-pulse" />
                <div className="h-16 w-64 bg-secondary/50 rounded animate-pulse" />
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

  return (
    <section className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <Image
          src={displayAnime.bannerImage || displayAnime.image}
          alt={`${displayAnime.title} Hero Background`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          quality={85}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-2xl space-y-6">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
                <Star className="w-3 h-3 mr-1 fill-primary" />
                {displayAnime.score.toFixed(1)} Score
              </Badge>
              {displayAnime.year && (
                <Badge variant="outline" className="border-border text-muted-foreground">
                  <Calendar className="w-3 h-3 mr-1" />
                  {displayAnime.year}
                </Badge>
              )}
              <Badge variant="outline" className="border-border text-muted-foreground">
                <Tv className="w-3 h-3 mr-1" />
                {displayAnime.episodes ? `${displayAnime.episodes} Episódios` : "Em lançamento"}
              </Badge>
              {displayAnime.duration && (
                <Badge variant="outline" className="border-border text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  {displayAnime.duration}
                </Badge>
              )}
            </div>

            {/* Title - Split into two lines for visual impact */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-balance">
              <span className="gradient-text">{displayAnime.title.split(":")[0] || displayAnime.title}</span>
              {displayAnime.title.includes(":") && (
                <>
                  <br />
                  <span className="text-foreground">{displayAnime.title.split(":")[1]?.trim()}</span>
                </>
              )}
            </h1>

            {/* Studio */}
            {displayAnime.studio && (
              <p className="text-muted-foreground text-sm uppercase tracking-widest">
                {displayAnime.studio}
                {displayAnime.genres.length > 0 && ` • ${displayAnime.genres.slice(0, 2).join(", ")}`}
              </p>
            )}

            {/* Synopsis */}
            <p className="text-muted-foreground text-base leading-relaxed max-w-xl line-clamp-3">
              {displayAnime.synopsis}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Button 
                size="lg" 
                className="glow-effect bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-lg"
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
                className="border-border hover:border-primary/50 hover:bg-primary/10 px-8 py-6 text-lg"
                onClick={onOpenAddons}
              >
                <Settings className="w-5 h-5 mr-2" />
                Gerenciar Add-ons
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6 pt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${activeSources > 0 ? "bg-green-500 animate-pulse" : "bg-destructive"}`} />
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
    </section>
  )
}
