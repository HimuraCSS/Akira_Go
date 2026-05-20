"use client"

import { useState, useRef, useMemo } from "react"
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
  sectionId?: string
}

export function AnimeCarousel({ 
  title = "Em Alta",
  subtitle = "Os animes mais populares da temporada",
  animes = [],
  isLoading = false,
  onPlayAnime,
  onAnimeInfo,
  sectionId = "default",
}: AnimeCarouselProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  
  // Deduplicate animes by ID
  const displayAnimes = useMemo(() => {
    const seen = new Set<string>()
    return animes.filter(anime => {
      if (seen.has(anime.id)) return false
      seen.add(anime.id)
      return true
    })
  }, [animes])

  const isEmpty = !isLoading && displayAnimes.length === 0

  const updateScrollButtons = () => {
    if (!scrollContainerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  const scrollLeft = () => {
    if (!scrollContainerRef.current) return
    const cardWidth = 200 // approximate card width + gap
    scrollContainerRef.current.scrollBy({ left: -cardWidth * 3, behavior: "smooth" })
    setTimeout(updateScrollButtons, 300)
  }

  const scrollRight = () => {
    if (!scrollContainerRef.current) return
    const cardWidth = 200
    scrollContainerRef.current.scrollBy({ left: cardWidth * 3, behavior: "smooth" })
    setTimeout(updateScrollButtons, 300)
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {!isEmpty && !isLoading && displayAnimes.length > 6 && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="border-border hover:border-primary/50 disabled:opacity-30"
                onClick={scrollLeft}
                disabled={!canScrollLeft}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="border-border hover:border-primary/50 disabled:opacity-30"
                onClick={scrollRight}
                disabled={!canScrollRight}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
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

        {/* Anime Scrollable Row */}
        {!isLoading && !isEmpty && (
          <div 
            ref={scrollContainerRef}
            onScroll={updateScrollButtons}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {displayAnimes.map((anime, index) => (
              <div 
                key={`${sectionId}-${anime.id}-${index}`}
                className="flex-shrink-0 w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] lg:w-[calc(16.666%-14px)]"
              >
                <AnimeCard
                  anime={anime}
                  isHovered={hoveredId === anime.id}
                  onHover={setHoveredId}
                  onPlay={onPlayAnime}
                  onInfo={onAnimeInfo}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
