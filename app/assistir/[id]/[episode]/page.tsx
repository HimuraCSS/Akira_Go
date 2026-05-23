"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
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
  Loader2,
  ArrowLeft,
  X,
  Server,
  Globe,
  Languages
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
import { updateWatchHistory } from "@/lib/watch-history"

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
  const [availableSources, setAvailableSources] = useState<Array<{
    url: string
    quality: string
    providerId: string
    providerName: string
    hasPTBR: boolean
  }>>([])
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [showProviders, setShowProviders] = useState(false)

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

  // Fetch stream URL with multiple providers
  useEffect(() => {
    const fetchStream = async () => {
      if (!anime) return
      
      setIsLoadingStream(true)
      try {
        const type = selectedSub === "dub" ? "dub" : "sub"
        const providerParam = selectedProvider ? `&provider=${selectedProvider}` : ""
        const res = await fetch(
          `/api/addon/stream?title=${encodeURIComponent(anime.title)}&episode=${currentEpisode}&type=${type}&ptbr=true${providerParam}`
        )
        const data = await res.json()
        
        if (data.success && data.sources?.length > 0) {
          // Store all available sources
          setAvailableSources(data.sources)
          
          // Find preferred source (PT-BR first if not already selected)
          let selectedSource = data.sources[0]
          if (!selectedProvider) {
            // Prefer PT-BR provider
            const ptbrSource = data.sources.find((s: { hasPTBR: boolean }) => s.hasPTBR)
            if (ptbrSource) {
              selectedSource = ptbrSource
              setSelectedProvider(ptbrSource.providerId)
            } else {
              setSelectedProvider(data.sources[0].providerId)
            }
          } else {
            // Use selected provider
            const providerSource = data.sources.find(
              (s: { providerId: string }) => s.providerId === selectedProvider
            )
            if (providerSource) {
              selectedSource = providerSource
            }
          }
          
          setStreamUrl(selectedSource.url)
          
          // Save to watch history
          updateWatchHistory({
            animeId: anime.mal_id,
            animeTitle: anime.title,
            animeImage: anime.images.jpg.large_image_url,
            episodeNumber: currentEpisode,
            totalEpisodes: anime.episodes || 12,
            progress: Math.round((currentEpisode / (anime.episodes || 12)) * 100),
          })
        }
      } catch (error) {
        console.error("Failed to fetch stream:", error)
      } finally {
        setIsLoadingStream(false)
      }
    }

    fetchStream()
  }, [anime, currentEpisode, selectedSub, selectedProvider])

  // Close provider dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showProviders && !(e.target as HTMLElement).closest('[data-provider-dropdown]')) {
        setShowProviders(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showProviders])

  const navigateEpisode = useCallback((direction: "prev" | "next") => {
    const newEpisode = direction === "next" ? currentEpisode + 1 : currentEpisode - 1
    if (newEpisode >= 1 && newEpisode <= (anime?.episodes || episodes.length || 999)) {
      router.push(`/assistir/${animeId}/${newEpisode}`)
    }
  }, [currentEpisode, anime?.episodes, episodes.length, animeId, router])

  const totalEpisodes = anime?.episodes || episodes.length || 12

  // Generate episode list with search filtering
  const episodeList = useMemo(() => {
    const list = episodes.length > 0 
      ? episodes 
      : Array.from({ length: totalEpisodes }, (_, i) => ({
          mal_id: i + 1,
          title: `Episódio ${i + 1}`,
          aired: "",
          filler: false,
          recap: false
        }))

    if (!searchQuery.trim()) return list

    return list.filter(ep => {
      const query = searchQuery.toLowerCase().trim()
      const epNumber = ep.mal_id.toString()
      const epTitle = (ep.title || `Episódio ${ep.mal_id}`).toLowerCase()
      
      return epNumber.includes(query) || 
             epTitle.includes(query) ||
             `ep ${epNumber}`.includes(query) ||
             `episodio ${epNumber}`.includes(query) ||
             `episódio ${epNumber}`.includes(query)
    })
  }, [episodes, totalEpisodes, searchQuery])

  const bannerImage = anime?.trailer?.images?.maximum_image_url || 
                      anime?.images?.webp?.large_image_url ||
                      anime?.images?.jpg?.large_image_url

  // Loading State with Blurred Background
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-primary/10 animate-pulse" />
        <div className="absolute inset-0 backdrop-blur-3xl" />
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              <Play className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-muted-foreground animate-pulse">Carregando anime...</p>
          </div>
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Blurred Background Image - Always visible */}
      <div className="fixed inset-0 z-0">
        <Image
          src={bannerImage || ""}
          alt=""
          fill
          className="object-cover scale-110"
          priority
        />
        <div className="absolute inset-0 backdrop-blur-3xl" />
        <div className="absolute inset-0 bg-background/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background" />
      </div>

      {/* Hero Loading Overlay */}
      {isLoadingStream && (
        <div className="fixed inset-0 z-50">
          {/* Sharp Background for Loading */}
          <div className="absolute inset-0">
            <Image
              src={bannerImage || ""}
              alt={anime.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          </div>

          {/* Loading Content */}
          <div className="relative z-10 h-full flex">
            {/* Left Side - Anime Info */}
            <div className="flex-1 flex flex-col justify-center px-6 lg:px-16 max-w-3xl">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-fit mb-6 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              {/* Season Badge */}
              {anime.season && (
                <Badge className="w-fit mb-4 bg-primary text-white border-0">
                  {anime.season.charAt(0).toUpperCase() + anime.season.slice(1)} {anime.year}
                </Badge>
              )}

              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white uppercase tracking-tight mb-4 drop-shadow-2xl">
                {anime.title}
              </h1>

              {/* Synopsis */}
              <p className="text-white/80 text-sm lg:text-base line-clamp-3 mb-6 max-w-xl leading-relaxed">
                {anime.synopsis}
              </p>

              {/* Rating & Info */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                  <span className="text-2xl font-bold text-white">{anime.score?.toFixed(1) || "N/A"}</span>
                  <span className="text-white/50">/10</span>
                </div>
                <Badge variant="outline" className="border-white/30 text-white bg-white/10">
                  {anime.rating || "TV"}
                </Badge>
                <Badge variant="outline" className="border-white/30 text-white bg-white/10">
                  {totalEpisodes} Episódios
                </Badge>
              </div>

              {/* Loading Button */}
              <div className="flex items-center gap-4">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white gap-3 px-8"
                  disabled
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Carregando Episódio {currentEpisode}...
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => setIsInList(!isInList)}
                >
                  {isInList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </Button>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mt-8">
                {anime.genres?.slice(0, 5).map((genre) => (
                  <Badge 
                    key={genre.mal_id} 
                    variant="outline"
                    className="border-white/20 text-white/90 bg-white/5 backdrop-blur-sm"
                  >
                    {genre.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Right Side - Episode Cards */}
            <div className="hidden lg:flex flex-col justify-center pr-8 xl:pr-16 gap-3">
              {[currentEpisode - 1, currentEpisode, currentEpisode + 1]
                .filter(ep => ep >= 1 && ep <= totalEpisodes)
                .map((ep) => (
                  <button
                    key={ep}
                    className={cn(
                      "relative w-56 xl:w-72 aspect-video rounded-xl overflow-hidden transition-all duration-300 group",
                      ep === currentEpisode 
                        ? "ring-2 ring-primary scale-105 shadow-xl shadow-primary/20" 
                        : "opacity-60 hover:opacity-100 hover:scale-102"
                    )}
                    onClick={() => router.push(`/assistir/${animeId}/${ep}`)}
                  >
                    <Image
                      src={bannerImage || ""}
                      alt={`Episódio ${ep}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
                        ep === currentEpisode 
                          ? "bg-primary" 
                          : "bg-white/20 backdrop-blur-sm"
                      )}>
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="text-white font-semibold text-sm">
                        Episódio {ep}
                      </span>
                      {ep === currentEpisode && (
                        <Badge className="bg-primary text-white text-xs">
                          ATUAL
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={cn(
        "relative z-10 transition-all duration-500",
        isLoadingStream ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            <div className="flex items-center gap-4">
              <Link href={`/anime/${params.id}`}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full bg-primary hover:bg-primary/90"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden relative hidden sm:block">
                  <Image
                    src={anime.images.jpg.large_image_url}
                    alt={anime.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h1 className="font-semibold text-sm lg:text-base line-clamp-1">
                    {anime.title}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Episódio {currentEpisode} de {totalEpisodes}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsInList(!isInList)}
                className="hidden sm:flex"
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
              <Link href={`/anime/${animeId}`}>
                <Button variant="outline" size="sm">
                  Ver Detalhes
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
          {/* Player Section */}
          <div className="flex-1 flex flex-col">
            {/* Video Player */}
            <div className="relative aspect-video bg-black/50 backdrop-blur-sm">
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
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
              )}
            </div>

            {/* Episode Progress Bar - Custom styled */}
            <div className="bg-card/90 backdrop-blur-sm px-4 py-2 border-b border-border/30">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Ep {currentEpisode}
                </span>
                <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden group cursor-pointer">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 relative"
                    style={{ width: `${Math.min((currentEpisode / totalEpisodes) * 100, 100)}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {totalEpisodes} eps
                </span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Playback Options */}
                <div className="flex items-center gap-4 lg:gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                    <Checkbox 
                      checked={autoplay} 
                      onCheckedChange={(c) => setAutoplay(!!c)}
                    />
                    <span className="hidden sm:inline">Autoplay</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                    <Checkbox 
                      checked={autoSkip} 
                      onCheckedChange={(c) => setAutoSkip(!!c)}
                    />
                    <span className="hidden sm:inline">Auto Skip</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                    <Checkbox 
                      checked={autoNext} 
                      onCheckedChange={(c) => setAutoNext(!!c)}
                    />
                    <span className="hidden sm:inline">Auto Next</span>
                  </label>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentEpisode <= 1}
                    onClick={() => navigateEpisode("prev")}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentEpisode >= totalEpisodes}
                    onClick={() => navigateEpisode("next")}
                    className="gap-1"
                  >
                    <span className="hidden sm:inline">Próximo</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Episode Info */}
            <div className="flex-1 p-4 lg:p-6 bg-card/50 backdrop-blur-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">
                    Episódio {currentEpisode}: {episodes[currentEpisode - 1]?.title || anime.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Se o servidor atual não funcionar, tente outros servidores.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Provider Selector */}
                  <div className="relative" data-provider-dropdown>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowProviders(!showProviders)}
                      className="gap-2 bg-background/50"
                    >
                      <Server className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {availableSources.find(s => s.providerId === selectedProvider)?.providerName || "Servidor"}
                      </span>
                      {availableSources.find(s => s.providerId === selectedProvider)?.hasPTBR && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-green-500/20 text-green-500">
                          PT-BR
                        </Badge>
                      )}
                    </Button>
                    
                    {/* Provider Dropdown */}
                    {showProviders && (
                      <div className="absolute top-full mt-2 right-0 z-50 w-72 max-h-80 overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
                        <div className="p-2 border-b border-border">
                          <p className="text-xs font-medium text-muted-foreground">Selecionar Servidor</p>
                        </div>
                        <div className="p-1">
                          {availableSources.map((source) => (
                            <button
                              key={source.providerId + source.quality}
                              onClick={() => {
                                setSelectedProvider(source.providerId)
                                setStreamUrl(source.url)
                                setShowProviders(false)
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                                selectedProvider === source.providerId
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-muted/50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Server className="w-4 h-4" />
                                <span className="font-medium">{source.providerName}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {source.hasPTBR && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-green-500/20 text-green-500">
                                    PT-BR
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {source.quality}
                                </Badge>
                                {selectedProvider === source.providerId && (
                                  <Check className="w-3 h-3 text-primary" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        {availableSources.length === 0 && (
                          <div className="p-4 text-center text-muted-foreground text-sm">
                            Carregando servidores...
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SUB/DUB Selector */}
                  <Select value={selectedSub} onValueChange={setSelectedSub}>
                    <SelectTrigger className="w-28 bg-background/50">
                      <Languages className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sub">Legendado</SelectItem>
                      <SelectItem value="dub">Dublado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              </div>

              {/* Genres & Studio */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {anime.studios?.[0] && (
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    {anime.studios[0].name}
                  </Badge>
                )}
                {anime.genres?.map((genre) => (
                  <Badge key={genre.mal_id} variant="secondary" className="bg-secondary/50">
                    {genre.name}
                  </Badge>
                ))}
              </div>

              {/* Synopsis */}
              <div className="mt-6 p-4 rounded-lg bg-background/50 border border-border/50">
                <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">
                  Sinopse
                </h3>
                <p className="text-sm leading-relaxed line-clamp-4">
                  {anime.synopsis}
                </p>
              </div>
            </div>
          </div>

          {/* Episodes Sidebar */}
          <aside className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="sticky top-16 h-[50vh] lg:h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Episódios</h3>
                  <Badge variant="outline" className="text-xs">
                    {episodeList.length} de {totalEpisodes}
                  </Badge>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar episódio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9 bg-background/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Episode List */}
              <div className="flex-1 overflow-y-auto">
                {episodeList.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Nenhum episódio encontrado</p>
                    <p className="text-xs mt-1">Tente buscar por número ou nome</p>
                  </div>
                ) : (
                  episodeList.map((ep) => {
                    const epNumber = ep.mal_id
                    const isCurrentEp = epNumber === currentEpisode
                    
                    return (
                      <Link
                        key={epNumber}
                        href={`/assistir/${animeId}/${epNumber}`}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 border-b border-border/30 transition-all",
                          isCurrentEp 
                            ? "bg-primary/10 border-l-2 border-l-primary" 
                            : "hover:bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold transition-colors shrink-0",
                          isCurrentEp 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted/50 text-muted-foreground"
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
                          <div className="flex items-center gap-2 mt-0.5">
                            {ep.filler && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-orange-500/50 text-orange-500">
                                Filler
                              </Badge>
                            )}
                            {ep.recap && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-500/50 text-blue-500">
                                Recap
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isCurrentEp && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-medium text-green-500 uppercase">
                              Playing
                            </span>
                          </div>
                        )}
                      </Link>
                    )
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
