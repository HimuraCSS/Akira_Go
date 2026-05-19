"use client"

import { useState } from "react"
import Image from "next/image"
import { Star, Play, Info, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Anime {
  id: string
  title: string
  japaneseTitle: string
  image: string
  score: number
  episodes: number
  status: "Airing" | "Completed" | "Upcoming"
  synopsis: string
  genres: string[]
}

const trendingAnimes: Anime[] = [
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
  },
]

export function AnimeCarousel() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const getStatusColor = (status: Anime["status"]) => {
    switch (status) {
      case "Airing":
        return "border-green-500/30 text-green-500 bg-green-500/10"
      case "Completed":
        return "border-primary/30 text-primary bg-primary/10"
      case "Upcoming":
        return "border-yellow-500/30 text-yellow-500 bg-yellow-500/10"
    }
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Em Alta</h2>
            <p className="text-sm text-muted-foreground">Os animes mais populares da temporada</p>
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

        {/* Carousel */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {trendingAnimes.map((anime) => (
            <div
              key={anime.id}
              className="group relative"
              onMouseEnter={() => setHoveredId(anime.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Card */}
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
                    {anime.score}
                  </Badge>
                </div>

                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  <Badge variant="outline" className={`text-xs ${getStatusColor(anime.status)}`}>
                    {anime.status === "Airing" ? "No Ar" : anime.status === "Completed" ? "Completo" : "Em Breve"}
                  </Badge>
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-sm font-semibold text-foreground truncate">{anime.title}</h3>
                  <p className="text-xs text-muted-foreground">{anime.episodes} episódios</p>
                </div>

                {/* Hover Overlay */}
                <div className={`absolute inset-0 bg-background/95 backdrop-blur-sm p-4 flex flex-col justify-between transition-opacity duration-300 ${
                  hoveredId === anime.id ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}>
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">{anime.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{anime.japaneseTitle}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {anime.genres.map((genre) => (
                        <Badge key={genre} variant="outline" className="text-xs border-border">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{anime.synopsis}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Play className="w-3 h-3 mr-1" />
                      Assistir
                    </Button>
                    <Button size="sm" variant="outline" className="border-border">
                      <Info className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
