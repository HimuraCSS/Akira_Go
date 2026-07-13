"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Bot, Star, ChevronLeft, ChevronRight, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRobot } from "@/hooks/use-maxun"

const ROBOTS = [
  { id: "top", name: "Top Ranqueados" },
  { id: "airing", name: "No Ar Agora" },
  { id: "popular", name: "Mais Populares" },
  { id: "upcoming", name: "Em Breve" },
  { id: "favorite", name: "Mais Favoritados" },
] as const

export function MaxunExplorer() {
  const [robotId, setRobotId] = useState<string>("top")
  const [page, setPage] = useState(1)
  const { animes, source, meta, isLoading, isError } = useRobot(robotId, { page })

  const selectRobot = (id: string) => {
    setRobotId(id)
    setPage(1)
  }

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-2">
        <Bot className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-bold text-foreground">Explorar via Maxun</h2>
          <p className="text-sm text-muted-foreground">
            Dados extraídos ao vivo por robôs de scraping declarativos
          </p>
        </div>
      </div>

      {/* Source indicator */}
      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <Database className="w-3.5 h-3.5" />
        <span>
          Fonte: {source || "MyAnimeList"}
          {meta?.durationMs ? ` • ${meta.durationMs}ms` : ""}
        </span>
      </div>

      {/* Robot selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ROBOTS.map((robot) => (
          <Button
            key={robot.id}
            variant={robotId === robot.id ? "default" : "outline"}
            size="sm"
            onClick={() => selectRobot(robot.id)}
            className={robotId === robot.id ? "bg-primary text-primary-foreground" : ""}
          >
            <Bot className="w-3.5 h-3.5 mr-1.5" />
            {robot.name}
          </Button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="glass-card rounded-lg overflow-hidden animate-pulse">
              <div className="aspect-[2/3] bg-secondary/50" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-secondary/50 rounded w-3/4" />
                <div className="h-3 bg-secondary/50 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="glass-card rounded-lg border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Não foi possível executar o robô agora. Tente novamente em instantes.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {animes.map((anime, i) => (
              <Link
                key={`${anime.id}-${i}`}
                href={`/anime/${anime.malId || anime.id}`}
                className="group relative glass-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all"
              >
                <div className="aspect-[2/3] relative">
                  <Image
                    src={anime.image || "/placeholder.svg"}
                    alt={anime.title}
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                  {anime.score > 0 && (
                    <Badge className="absolute top-2 right-2 bg-background/80 text-foreground border-none">
                      <Star className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" />
                      {anime.score.toFixed(2)}
                    </Badge>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <Badge className="bg-primary/90 text-primary-foreground border-none text-xs">
                      #{(page - 1) * 50 + i + 1}
                    </Badge>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-foreground line-clamp-2">{anime.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {anime.year || "—"} • {anime.episodes ? `${anime.episodes} eps` : "? eps"}
                    {anime.genres[0] ? ` • ${anime.genres[0]}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">Página {page}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={animes.length === 0}
            >
              Próxima
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
