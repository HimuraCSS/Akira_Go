"use client"

import Image from "next/image"
import { Star, Play, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface AnimeData {
  id: string
  title: string
  japaneseTitle?: string
  image: string
  bannerImage?: string
  score: number
  episodes: number | null
  status: "Airing" | "Completed" | "Upcoming"
  synopsis: string
  genres: string[]
  year?: number
  studio?: string
  duration?: string
}

interface AnimeCardProps {
  anime: AnimeData
  isHovered: boolean
  onHover: (id: string | null) => void
  onPlay?: (anime: AnimeData) => void
  onInfo?: (anime: AnimeData) => void
}

export function AnimeCard({ anime, isHovered, onHover, onPlay, onInfo }: AnimeCardProps) {
  const getStatusColor = (status: AnimeData["status"]) => {
    switch (status) {
      case "Airing":
        return "border-green-500/30 text-green-500 bg-green-500/10"
      case "Completed":
        return "border-primary/30 text-primary bg-primary/10"
      case "Upcoming":
        return "border-yellow-500/30 text-yellow-500 bg-yellow-500/10"
    }
  }

  const getStatusLabel = (status: AnimeData["status"]) => {
    switch (status) {
      case "Airing":
        return "No Ar"
      case "Completed":
        return "Completo"
      case "Upcoming":
        return "Em Breve"
    }
  }

  return (
    <div
      className="group relative"
      onMouseEnter={() => onHover(anime.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden glass-card border border-border group-hover:border-primary/50 transition-all duration-300">
        <Image
          src={anime.image}
          alt={anime.title}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
          className="object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
        
        {/* Score Badge */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-background/80 backdrop-blur-sm text-foreground border-none">
            <Star className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" />
            {anime.score.toFixed(1)}
          </Badge>
        </div>

        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="outline" className={`text-xs ${getStatusColor(anime.status)}`}>
            {getStatusLabel(anime.status)}
          </Badge>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-semibold text-foreground truncate">{anime.title}</h3>
          <p className="text-xs text-muted-foreground">
            {anime.episodes ? `${anime.episodes} episódios` : "Em lançamento"}
          </p>
        </div>

        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-background/95 backdrop-blur-sm p-4 flex flex-col justify-between transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}>
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">{anime.title}</h3>
            {anime.japaneseTitle && (
              <p className="text-xs text-muted-foreground mb-2">{anime.japaneseTitle}</p>
            )}
            <div className="flex flex-wrap gap-1 mb-2">
              {anime.genres.slice(0, 3).map((genre) => (
                <Badge key={genre} variant="outline" className="text-xs border-border">
                  {genre}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3">{anime.synopsis}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => onPlay?.(anime)}
            >
              <Play className="w-3 h-3 mr-1" />
              Assistir
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-border"
              onClick={() => onInfo?.(anime)}
            >
              <Info className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Skeleton loading component
export function AnimeCardSkeleton() {
  return (
    <div className="relative aspect-[2/3] rounded-lg overflow-hidden glass-card border border-border animate-pulse">
      <div className="absolute inset-0 bg-secondary/50" />
      <div className="absolute top-2 right-2">
        <div className="h-5 w-12 bg-secondary/70 rounded" />
      </div>
      <div className="absolute top-2 left-2">
        <div className="h-5 w-16 bg-secondary/70 rounded" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
        <div className="h-4 bg-secondary/70 rounded w-3/4" />
        <div className="h-3 bg-secondary/70 rounded w-1/2" />
      </div>
    </div>
  )
}
