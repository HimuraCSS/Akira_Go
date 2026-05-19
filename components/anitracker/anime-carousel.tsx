"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimeCard, AnimeCardSkeleton, type AnimeData } from "./anime-card"

interface AnimeCarouselProps {
  title?: string
  subtitle?: string
  animes?: AnimeData[]
  isLoading?: boolean
  onPlayAnime?: (anime: AnimeData) => void
  onAnimeInfo?: (anime: AnimeData) => void
  sectionId?: string // Unique section identifier to prevent duplicate keys across sections
}

// Default data for when no props are provided
const defaultAnimes: AnimeData[] = [
  {
    id: "1",
    title: "Solo Leveling",
    japaneseTitle: "俺だけレベルアップな件",
    image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&q=80",
    score: 8.9,
    episodes: 12,
    status: "Airing",
    synopsis: "Após ser despertado com poderes únicos, o caçador mais fraco de todos se torna o mais forte...",
    genres: ["Ação", "Fantasia"],
    year: 2024,
  },
  {
    id: "2",
    title: "Demon Slayer",
    japaneseTitle: "鬼滅の刃",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80",
    score: 9.2,
    episodes: 26,
    status: "Completed",
    synopsis: "Tanjiro busca vingança contra os demônios que destruíram sua família...",
    genres: ["Ação", "Sobrenatural"],
    year: 2019,
  },
  {
    id: "3",
    title: "Jujutsu Kaisen",
    japaneseTitle: "呪術廻戦",
    image: "https://images.unsplash.com/photo-1614583225154-5fcdda07019e?w=400&q=80",
    score: 8.7,
    episodes: 24,
    status: "Completed",
    synopsis: "Yuji Itadori se junta à luta contra maldições sobrenaturais...",
    genres: ["Ação", "Horror"],
    year: 2020,
  },
  {
    id: "4",
    title: "Attack on Titan",
    japaneseTitle: "進撃の巨人",
    image: "https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?w=400&q=80",
    score: 9.5,
    episodes: 87,
    status: "Completed",
    synopsis: "A humanidade luta pela sobrevivência contra gigantes devoradores...",
    genres: ["Ação", "Drama"],
    year: 2013,
  },
  {
    id: "5",
    title: "My Hero Academia",
    japaneseTitle: "僕のヒーローアカデミア",
    image: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&q=80",
    score: 8.4,
    episodes: 138,
    status: "Airing",
    synopsis: "Em um mundo de super-heróis, um garoto sem poderes sonha em se tornar o maior...",
    genres: ["Ação", "Escolar"],
    year: 2016,
  },
  {
    id: "6",
    title: "Chainsaw Man",
    japaneseTitle: "チェンソーマン",
    image: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=400&q=80",
    score: 8.8,
    episodes: 12,
    status: "Completed",
    synopsis: "Denji se funde com seu demônio motosserra para caçar demônios...",
    genres: ["Ação", "Horror"],
    year: 2022,
  },
]

export function AnimeCarousel({ 
  title = "Em Alta",
  subtitle = "Os animes mais populares da temporada",
  animes,
  isLoading = false,
  onPlayAnime,
  onAnimeInfo,
  sectionId = "default",
}: AnimeCarouselProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  
  // Use provided animes or fallback to defaults
  const displayAnimes = animes ?? defaultAnimes
  const isEmpty = !isLoading && displayAnimes.length === 0

  return (
    <section className="py-8">
      <div className="container mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="border-border hover:border-primary/50">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="border-border hover:border-primary/50">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <AnimeCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 glass-card rounded-lg border border-border">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm">Nenhum anime encontrado</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Tente ajustar seus filtros ou provedores</p>
          </div>
        )}

        {/* Anime Grid */}
        {!isLoading && !isEmpty && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {displayAnimes.map((anime, index) => (
              <AnimeCard
                key={`${sectionId}-${anime.id}-${index}`}
                anime={anime}
                isHovered={hoveredId === anime.id}
                onHover={setHoveredId}
                onPlay={onPlayAnime}
                onInfo={onAnimeInfo}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
