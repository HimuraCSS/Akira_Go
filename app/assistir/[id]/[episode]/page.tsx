"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { 
  Play, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Check,
  Search,
  Download,
  Settings,
  Loader2,
  ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface AnimeData {
  mal_id: number
  title: string
  title_japanese: string
  synopsis: string
  score: number
  episodes: number
  status: string
  year: number
  season: string
  images: {
    jpg: { large_image_url: string }
    webp: { large_image_url: string }
  }
  genres: { mal_id: number; name: string }[]
  studios: { mal_id: number; name: string }[]
  rating: string
  duration: string
  trailer?: {
    images?: {
      maximum_image_url?: string
    }
  }
}

interface Episode {
  mal_id: number
  title: string
  aired: string
  filler: boolean
  recap: boolean
}

export default function WatchPage() {
  const params = useParams()
  const router = useRouter()
  const animeId = params.id as string
  const currentEpisode = parseInt(params.episode as string) || 1
  
  const [anime, setAnime] = useState<AnimeData | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInList, setIsInList] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [autoplay, setAutoplay] = useState(true)
  const [autoSkip, setAutoSkip] = useState(true)
  const [autoNext, setAutoNext] = useState(true)
  const [selectedSub, setSelectedSub] = useState("sub")
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [isLoadingStream, setIsLoadingStream] = useState(false)

  // Fetch anime data
  useEffect(() => {
    const fetchAnimeData = async () => {
      setIsLoading(true)
      try {
        const [animeRes, episodesRes] = await Promise.all([
          fetch(`https://api.jikan.moe/v4/anime/${animeId}`),
          fetch(`https://api.jikan.moe/v4/anime/${animeId}/episodes`)
        ])
        
        const animeData = await animeRes.json()
        const episodesData = await episodesRes.json()
        
        setAnime(animeData.data)
        setEpisodes(episodesData.data || [])
      } catch (error) {
        console.error("Failed to fetch anime:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (animeId) {
      fetchAnimeData()
    }
  }, [animeId])

  // Fetch stream URL
  useEffect(() => {
    const fetchStream = async () => {
      if (!anime) return
      
      setIsLoadingStream(true)
      try {
        const res = await fetch(
          `/api/addon/stream?title=${encodeURIComponent(anime.title)}&episode=${currentEpisode}`
        )
        const data = await res.json()
        
        if (data.success && data.sources?.length > 0) {
          const source = selectedSub === "dub" 
            ? data.sources.find((s: { quality: string }) => s.quality === "DUB") || data.sources[0]
            : data.sources[0]
          setStreamUrl(source.url)
        }
      } catch (error) {
        console.error("Failed to fetch stream:", error)
      } finally {
        setIsLoadingStream(false)
      }
    }

    fetchStream()
  }, [anime, currentEpisode, selectedSub])

  const navigateEpisode = useCallback((direction: "prev" | "next") => {
    const newEpisode = direction === "next" ? currentEpisode + 1 : currentEpisode - 1
    if (newEpisode >= 1 && newEpisode <= (anime?.episodes || episodes.length || 999)) {
      router.push(`/assistir/${animeId}/${newEpisode}`)
    }
  }, [currentEpisode, anime?.episodes, episodes.length, animeId, router])

  const filteredEpisodes = episodes.filter(ep => 
    ep.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ep.mal_id.toString().includes(searchQuery)
  )

  const totalEpisodes = anime?.episodes || episodes.length || 12
  const episodeList = episodes.length > 0 
    ? filteredEpisodes 
    : Array.from({ length: totalEpisodes }, (_, i) => ({
        mal_id: i + 1,
        title: `Episódio ${i + 1}`,
        aired: "",
        filler: false,
        recap: false
      }))

  const bannerImage = anime?.trailer?.images?.maximum_image_url || 
                      anime?.images?.webp?.large_image_url ||
                      anime?.images?.jpg?.large_image_url

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl">Anime não encontrado</p>
          <Button asChild>
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner - Only shows while stream is loading */}
      {isLoadingStream && (
        <div className="fixed inset-0 z-50">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={bannerImage || ""}
              alt={anime.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
          </div>

          {/* Content */}
          <div className="relative z-10 h-full flex">
            {/* Left Side - Anime Info */}
            <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 max-w-2xl">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-fit mb-6 text-white/70 hover:text-white"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              {/* Season Badge */}
              {anime.season && (
                <Badge className="w-fit mb-4 bg-primary/20 text-primary border-primary/30">
                  {anime.season} {anime.year}
                </Badge>
              )}

              {/* Title */}
              <h1 className="text-4xl lg:text-6xl font-black text-white uppercase tracking-tight mb-4 text-balance">
                {anime.title}
              </h1>

              {/* Synopsis */}
              <p className="text-white/70 text-sm lg:text-base line-clamp-4 mb-6 max-w-lg">
                {anime.synopsis}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-white font-bold">{anime.score?.toFixed(1) || "N/A"}</span>
                  <span className="text-white/50">/10</span>
                </div>
                <Badge variant="outline" className="border-white/30 text-white">
                  {anime.rating || "TV"}
                </Badge>
              </div>

              {/* Loading Indicator */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-primary/20 backdrop-blur-sm rounded-full px-6 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-white font-medium">
                    Carregando Episódio {currentEpisode}...
                  </span>
                </div>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mt-8">
                {anime.genres?.slice(0, 4).map((genre) => (
                  <Badge 
                    key={genre.mal_id} 
                    variant="outline"
                    className="border-white/20 text-white/80 bg-white/5"
                  >
                    {genre.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Right Side - Episode Thumbnails */}
            <div className="hidden lg:flex flex-col justify-center pr-16 gap-4">
              {[currentEpisode - 1, currentEpisode, currentEpisode + 1]
                .filter(ep => ep >= 1 && ep <= totalEpisodes)
                .map((ep) => (
                  <div
                    key={ep}
                    className={cn(
                      "relative w-64 aspect-video rounded-lg overflow-hidden cursor-pointer transition-all",
                      ep === currentEpisode 
                        ? "ring-2 ring-primary scale-105" 
                        : "opacity-60 hover:opacity-100"
                    )}
                    onClick={() => router.push(`/assistir/${animeId}/${ep}`)}
                  >
                    <Image
                      src={bannerImage || ""}
                      alt={`Episódio ${ep}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute bottom-2 left-2 text-white text-sm font-medium">
                      EP {ep}
                    </div>
                    {ep === currentEpisode && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-primary text-white text-xs">
                          ATUAL
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Watch Layout */}
      <div className={cn(
        "transition-opacity duration-500",
        isLoadingStream ? "opacity-0" : "opacity-100"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-sm lg:text-base line-clamp-1">
                  {anime.title}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Episódio {currentEpisode} de {totalEpisodes}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsInList(!isInList)}
              >
                {isInList ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    Na Lista
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row">
          {/* Player Section */}
          <div className="flex-1">
            {/* Video Player */}
            <div className="relative aspect-video bg-black">
              {streamUrl ? (
                <iframe
                  key={streamUrl}
                  src={streamUrl}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="bg-card border-b border-border px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Playback Options */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox 
                      checked={autoplay} 
                      onCheckedChange={(c) => setAutoplay(!!c)}
                    />
                    Autoplay
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox 
                      checked={autoSkip} 
                      onCheckedChange={(c) => setAutoSkip(!!c)}
                    />
                    Auto Skip
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox 
                      checked={autoNext} 
                      onCheckedChange={(c) => setAutoNext(!!c)}
                    />
                    Auto Next
                  </label>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentEpisode <= 1}
                    onClick={() => navigateEpisode("prev")}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentEpisode >= totalEpisodes}
                    onClick={() => navigateEpisode("next")}
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Episode Info */}
            <div className="p-4 lg:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-1">
                    Episódio {currentEpisode}: {episodes[currentEpisode - 1]?.title || anime.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Se o servidor atual não funcionar, tente outros servidores.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* SUB/DUB Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">SUB</span>
                    <Select value={selectedSub} onValueChange={setSelectedSub}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sub">SUB</SelectItem>
                        <SelectItem value="dub">DUB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Synopsis */}
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Sinopse</h3>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {anime.synopsis}
                </p>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mt-4">
                {anime.genres?.map((genre) => (
                  <Badge key={genre.mal_id} variant="secondary">
                    {genre.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Episodes Sidebar */}
          <aside className="w-full lg:w-80 xl:w-96 border-l border-border bg-card/50">
            <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-lg mb-3">Episódios</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Episode List */}
              <div className="flex-1 overflow-y-auto">
                {episodeList.map((ep) => {
                  const epNumber = ep.mal_id
                  const isCurrentEp = epNumber === currentEpisode
                  
                  return (
                    <Link
                      key={epNumber}
                      href={`/assistir/${animeId}/${epNumber}`}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 border-b border-border/50 transition-colors",
                        isCurrentEp 
                          ? "bg-primary/10 border-l-2 border-l-primary" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium",
                        isCurrentEp 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {isCurrentEp ? (
                          <Play className="w-4 h-4 fill-current" />
                        ) : (
                          epNumber
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isCurrentEp && "text-primary"
                        )}>
                          {ep.title || `Episódio ${epNumber}`}
                        </p>
                        {ep.filler && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Filler
                          </Badge>
                        )}
                      </div>
                      {isCurrentEp && (
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                          PLAYING
                        </Badge>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>

        {/* Related Anime Section */}
        <section className="border-t border-border p-6 lg:hidden">
          <h3 className="font-semibold text-lg mb-4">Animes Relacionados</h3>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {/* Placeholder for related anime */}
            <div className="flex-shrink-0 w-32">
              <div className="aspect-[3/4] bg-muted rounded-lg mb-2" />
              <p className="text-xs text-muted-foreground">Em breve...</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
