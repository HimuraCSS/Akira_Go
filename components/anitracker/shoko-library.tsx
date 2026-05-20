"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useShokoFetch } from "./shoko-settings"
import { useStreaming } from "./streaming-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Server, Play, ChevronRight, HardDrive, RefreshCw } from "lucide-react"

interface ShokoAnime {
  id: string
  title: string
  image: string
  score: number | null
  episodes: number | null
  status: string
  synopsis: string
  year: number | null
  anidbId: number
  malId: number | null
}

interface ShokoEpisode {
  id: string
  number: number
  title: string
  thumbnail: string
  duration: string
  animeId: string
  animeTitle: string
  watched: boolean
  resumePosition: number
}

export function ShokoLibrary() {
  const { fetchWithAuth, isConnected, config } = useShokoFetch()
  const { loadAnimeEpisodes, playEpisode } = useStreaming()
  const [series, setSeries] = useState<ShokoAnime[]>([])
  const [selectedSeries, setSelectedSeries] = useState<ShokoAnime | null>(null)
  const [episodes, setEpisodes] = useState<ShokoEpisode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const loadLibrary = useCallback(async () => {
    if (!isConnected) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchWithAuth("/series?pageSize=50")
      const data = await response.json()

      if (data.success) {
        setSeries(data.data)
        setTotal(data.total)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError("Falha ao carregar biblioteca")
    } finally {
      setIsLoading(false)
    }
  }, [fetchWithAuth, isConnected])

  const loadEpisodes = async (anime: ShokoAnime) => {
    setSelectedSeries(anime)
    setIsLoadingEpisodes(true)

    try {
      const response = await fetchWithAuth(`/series/${anime.id}`)
      const data = await response.json()

      if (data.success) {
        setEpisodes(data.data.episodes)
      }
    } catch {
      setError("Falha ao carregar episodios")
    } finally {
      setIsLoadingEpisodes(false)
    }
  }

  const playFromShoko = async (episode: ShokoEpisode) => {
    if (!config) return

    try {
      // Get stream info from Shoko
      const response = await fetchWithAuth(`/stream/${episode.id}`)
      const data = await response.json()

      if (data.success && data.data.sources.length > 0) {
        // Play directly using Shoko's stream URL
        const source = data.data.sources[0]
        
        // Create episode object for the player
        const episodeObj = {
          id: episode.id,
          number: episode.number,
          title: episode.title,
          thumbnail: episode.thumbnail,
          duration: episode.duration,
          animeId: episode.animeId,
          animeTitle: episode.animeTitle,
        }

        await playEpisode(episodeObj)
      }
    } catch {
      setError("Falha ao iniciar reproducao")
    }
  }

  useEffect(() => {
    if (isConnected) {
      loadLibrary()
    }
  }, [isConnected, loadLibrary])

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Shoko Nao Conectado</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Configure o Shoko Server nas configuracoes para acessar sua biblioteca local
        </p>
      </div>
    )
  }

  if (selectedSeries) {
    return (
      <div className="space-y-4">
        {/* Back button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            setSelectedSeries(null)
            setEpisodes([])
          }}
          className="mb-2"
        >
          <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
          Voltar
        </Button>

        {/* Series header */}
        <div className="flex gap-4">
          <div className="w-32 aspect-[2/3] relative rounded-lg overflow-hidden">
            <Image
              src={selectedSeries.image}
              alt={selectedSeries.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{selectedSeries.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              {selectedSeries.score && (
                <Badge variant="secondary">{selectedSeries.score.toFixed(1)}</Badge>
              )}
              {selectedSeries.episodes && (
                <Badge variant="outline">{selectedSeries.episodes} eps</Badge>
              )}
              <Badge variant="outline" className="text-green-500 border-green-500/30">
                <HardDrive className="w-3 h-3 mr-1" />
                Local
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
              {selectedSeries.synopsis}
            </p>
          </div>
        </div>

        {/* Episodes */}
        {isLoadingEpisodes ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-2">
            {episodes.map((episode) => (
              <button
                key={episode.id}
                onClick={() => playFromShoko(episode)}
                className="flex items-center gap-3 p-3 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors text-left"
              >
                <div className="w-24 aspect-video relative rounded overflow-hidden">
                  <Image
                    src={episode.thumbnail}
                    alt={episode.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {episode.number}. {episode.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{episode.duration}</p>
                </div>
                {episode.watched && (
                  <Badge variant="secondary" className="text-xs">Visto</Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            Biblioteca Local
          </h2>
          <p className="text-xs text-muted-foreground">{total} series no Shoko</p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadLibrary} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {series.map((anime) => (
            <button
              key={anime.id}
              onClick={() => loadEpisodes(anime)}
              className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary"
            >
              <Image
                src={anime.image}
                alt={anime.title}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-xs font-medium text-white line-clamp-2">{anime.title}</p>
                {anime.episodes && (
                  <p className="text-xs text-white/70">{anime.episodes} eps</p>
                )}
              </div>
              <Badge 
                variant="secondary" 
                className="absolute top-2 right-2 text-xs bg-green-500/80 text-white"
              >
                <HardDrive className="w-3 h-3" />
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
