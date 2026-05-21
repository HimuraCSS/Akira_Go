"use client"

import { useEffect, useState, use } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Play, 
  Plus, 
  Star,
  Calendar,
  Clock,
  Tv,
  Users,
  Heart,
  Share2,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface AnimeDetails {
  mal_id: number
  title: string
  title_japanese: string
  title_english: string
  images: {
    jpg: { large_image_url: string; image_url: string }
    webp: { large_image_url: string }
  }
  trailer: {
    youtube_id: string
    images: { maximum_image_url: string }
  }
  synopsis: string
  score: number
  scored_by: number
  rank: number
  popularity: number
  members: number
  favorites: number
  episodes: number
  status: string
  rating: string
  duration: string
  aired: {
    from: string
    to: string
    string: string
  }
  season: string
  year: number
  studios: { mal_id: number; name: string }[]
  genres: { mal_id: number; name: string }[]
  themes: { mal_id: number; name: string }[]
  demographics: { mal_id: number; name: string }[]
  relations: {
    relation: string
    entry: { mal_id: number; name: string; type: string }[]
  }[]
  streaming: { name: string; url: string }[]
}

interface AnimeImages {
  jpg: { image_url: string; large_image_url: string }
}

interface Character {
  character: {
    mal_id: number
    name: string
    images: { jpg: { image_url: string } }
  }
  role: string
  voice_actors: {
    person: { mal_id: number; name: string; images: { jpg: { image_url: string } } }
    language: string
  }[]
}

export default function AnimeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [anime, setAnime] = useState<AnimeDetails | null>(null)
  const [pictures, setPictures] = useState<AnimeImages[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [showFullSynopsis, setShowFullSynopsis] = useState(false)
  const [showGallery, setShowGallery] = useState(true)
  const [activeTab, setActiveTab] = useState<"info" | "characters" | "related">("info")

  useEffect(() => {
    const fetchAnimeDetails = async () => {
      try {
        setLoading(true)
        
        // Fetch anime details
        const response = await fetch(`https://api.jikan.moe/v4/anime/${resolvedParams.id}/full`)
        const data = await response.json()
        setAnime(data.data)

        // Fetch pictures with delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 400))
        const picturesRes = await fetch(`https://api.jikan.moe/v4/anime/${resolvedParams.id}/pictures`)
        const picturesData = await picturesRes.json()
        setPictures(picturesData.data || [])

        // Fetch characters with delay
        await new Promise(resolve => setTimeout(resolve, 400))
        const charsRes = await fetch(`https://api.jikan.moe/v4/anime/${resolvedParams.id}/characters`)
        const charsData = await charsRes.json()
        setCharacters(charsData.data?.slice(0, 12) || [])

      } catch (error) {
        console.error("Error fetching anime:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnimeDetails()
  }, [resolvedParams.id])

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500"
    if (score >= 7) return "text-yellow-500"
    if (score >= 6) return "text-orange-500"
    return "text-red-500"
  }

  const getScoreRingColor = (score: number) => {
    if (score >= 8) return "stroke-green-500"
    if (score >= 7) return "stroke-yellow-500"
    if (score >= 6) return "stroke-orange-500"
    return "stroke-red-500"
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
    if (num >= 1000) return (num / 1000).toFixed(1) + "K"
    return num.toString()
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      "Finished Airing": "Completo",
      "Currently Airing": "No Ar",
      "Not yet aired": "Em Breve",
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Loading skeleton */}
        <div className="relative h-[70vh] bg-secondary/30 animate-pulse" />
        <div className="container mx-auto px-4 py-8">
          <div className="h-8 w-64 bg-secondary/50 rounded mb-4 animate-pulse" />
          <div className="h-4 w-full max-w-2xl bg-secondary/30 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Anime não encontrado</h1>
          <Button onClick={() => router.back()}>Voltar</Button>
        </div>
      </div>
    )
  }

  const bannerImage = anime.trailer?.images?.maximum_image_url || 
                      anime.images?.webp?.large_image_url || 
                      anime.images?.jpg?.large_image_url

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-[75vh] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src={bannerImage}
            alt={anime.title}
            fill
            className="object-cover object-center"
            priority
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
        </div>

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-20">
          <Button 
            variant="ghost" 
            size="icon"
            className="bg-background/50 backdrop-blur-sm hover:bg-background/70"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* MAL Score Badge */}
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-background/50 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">MAL</span>
            <span className="font-bold">{anime.score?.toFixed(1) || "N/A"}</span>
          </div>
        </div>

        {/* Title and Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-10">
          <div className="container mx-auto">
            {/* Status Badge */}
            <Badge 
              className={`mb-4 ${
                anime.status === "Currently Airing" 
                  ? "bg-green-500/20 text-green-400 border-green-500/30" 
                  : "bg-primary/20 text-primary border-primary/30"
              }`}
              variant="outline"
            >
              {getStatusLabel(anime.status)}
            </Badge>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight mb-4 text-white drop-shadow-lg">
              {anime.title_english || anime.title}
            </h1>

            {/* Japanese Title */}
            {anime.title_japanese && (
              <p className="text-lg md:text-xl text-white/70 mb-4 font-light">
                {anime.title_japanese}
              </p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 text-sm md:text-base text-white/80 mb-6">
              {anime.year && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {anime.year}
                </span>
              )}
              {anime.season && (
                <span className="capitalize">{anime.season}</span>
              )}
              <span className="text-white/40">|</span>
              <span className="flex items-center gap-1">
                <Tv className="w-4 h-4" />
                {anime.episodes ? `${anime.episodes} episódios` : "Em lançamento"}
              </span>
              {anime.duration && (
                <>
                  <span className="text-white/40">|</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {anime.duration}
                  </span>
                </>
              )}
              {anime.rating && (
                <>
                  <span className="text-white/40">|</span>
                  <span>{anime.rating}</span>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Link href={`/assistir/${anime.mal_id}/1`}>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                  <Play className="w-5 h-5 fill-current" />
                  Assistir Agora
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 gap-2">
                <Plus className="w-5 h-5" />
                Adicionar à Lista
              </Button>
              <Button size="icon" variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
                <Heart className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar - Poster and Score */}
          <div className="space-y-6">
            {/* Poster */}
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-border">
              <Image
                src={anime.images.jpg.large_image_url}
                alt={anime.title}
                fill
                className="object-cover"
              />
            </div>

            {/* Score Circle */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-center gap-6">
                {/* Circular Score */}
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-secondary"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * (anime.score || 0)) / 10}
                      strokeLinecap="round"
                      className={getScoreRingColor(anime.score)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl font-bold ${getScoreColor(anime.score)}`}>
                      {anime.score?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-muted-foreground">Rank #{anime.rank || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-muted-foreground">{formatNumber(anime.members)} membros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-muted-foreground">{formatNumber(anime.favorites)} favoritos</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Studios */}
            {anime.studios?.length > 0 && (
              <div className="bg-card rounded-xl p-4 border border-border">
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Estúdio</h3>
                <div className="space-y-1">
                  {anime.studios.map((studio) => (
                    <p key={studio.mal_id} className="font-medium">{studio.name}</p>
                  ))}
                </div>
              </div>
            )}

            {/* External Links */}
            <div className="bg-card rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Links Externos</h3>
              <div className="space-y-2">
                <a 
                  href={`https://myanimelist.net/anime/${anime.mal_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  MyAnimeList
                </a>
                {anime.streaming?.map((stream) => (
                  <a 
                    key={stream.name}
                    href={stream.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {stream.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Synopsis */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-bold mb-4">Sinopse</h2>
              <p className={`text-muted-foreground leading-relaxed ${!showFullSynopsis && "line-clamp-4"}`}>
                {anime.synopsis || "Sinopse não disponível."}
              </p>
              {anime.synopsis && anime.synopsis.length > 300 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-primary"
                  onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                >
                  {showFullSynopsis ? (
                    <>Ver menos <ChevronUp className="w-4 h-4 ml-1" /></>
                  ) : (
                    <>Ver mais <ChevronDown className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              )}

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mt-6">
                {anime.genres?.map((genre) => (
                  <Badge 
                    key={genre.mal_id} 
                    variant="outline"
                    className="rounded-full px-4 py-1.5 border-primary/30 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    {genre.name}
                  </Badge>
                ))}
                {anime.themes?.map((theme) => (
                  <Badge 
                    key={theme.mal_id} 
                    variant="outline"
                    className="rounded-full px-4 py-1.5 border-border hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    {theme.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-border">
              {["info", "characters", "related"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                    activeTab === tab 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "info" && "Informações"}
                  {tab === "characters" && "Personagens"}
                  {tab === "related" && "Relacionados"}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "info" && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                  <h3 className="font-semibold">Informações</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Tipo</dt>
                      <dd>TV</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Episódios</dt>
                      <dd>{anime.episodes || "?"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>{getStatusLabel(anime.status)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Exibido</dt>
                      <dd>{anime.aired?.string || "?"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Duração</dt>
                      <dd>{anime.duration || "?"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Classificação</dt>
                      <dd>{anime.rating || "?"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                  <h3 className="font-semibold">Estatísticas</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Score</dt>
                      <dd className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        {anime.score?.toFixed(2) || "N/A"} ({formatNumber(anime.scored_by)} votos)
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Rank</dt>
                      <dd>#{anime.rank || "N/A"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Popularidade</dt>
                      <dd>#{anime.popularity || "N/A"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Membros</dt>
                      <dd>{formatNumber(anime.members)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Favoritos</dt>
                      <dd>{formatNumber(anime.favorites)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {activeTab === "characters" && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {characters.map((char) => (
                  <div key={char.character.mal_id} className="bg-card rounded-xl overflow-hidden border border-border group">
                    <div className="relative aspect-[3/4]">
                      <Image
                        src={char.character.images.jpg.image_url}
                        alt={char.character.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="font-medium text-sm truncate">{char.character.name}</p>
                        <p className="text-xs text-muted-foreground">{char.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {characters.length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground py-8">
                    Nenhum personagem encontrado.
                  </p>
                )}
              </div>
            )}

            {activeTab === "related" && (
              <div className="space-y-4">
                {anime.relations?.map((relation) => (
                  <div key={relation.relation} className="bg-card rounded-xl p-4 border border-border">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">{relation.relation}</h4>
                    <div className="space-y-2">
                      {relation.entry.map((entry) => (
                        <Link
                          key={entry.mal_id}
                          href={entry.type === "anime" ? `/anime/${entry.mal_id}` : "#"}
                          className="block hover:text-primary transition-colors"
                        >
                          {entry.name}
                          <span className="text-xs text-muted-foreground ml-2">({entry.type})</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                {(!anime.relations || anime.relations.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum anime relacionado encontrado.
                  </p>
                )}
              </div>
            )}

            {/* Gallery */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setShowGallery(!showGallery)}
                className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
              >
                <h2 className="text-xl font-bold">Galeria</h2>
                {showGallery ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              
              {showGallery && pictures.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 p-1">
                  {pictures.slice(0, 9).map((pic, index) => (
                    <div key={index} className="relative aspect-video overflow-hidden">
                      <Image
                        src={pic.jpg.large_image_url || pic.jpg.image_url}
                        alt={`${anime.title} - Imagem ${index + 1}`}
                        fill
                        className="object-cover hover:scale-110 transition-transform duration-300 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {showGallery && pictures.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma imagem disponível.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
