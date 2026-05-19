"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Search, Filter, Star, Play, Info, Shuffle, TrendingUp, Sparkles, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useAnimeSearch, useTopAnime, usePopularAnime } from "@/hooks/use-anime"
import { useDebounce } from "@/hooks/use-debounce"
import { fetchAnimeByGenre, fetchRandomAnime, GENRE_IDS } from "@/lib/jikan-api"
import type { AnimeData } from "@/components/anitracker/anime-card"

const GENRES = [
  { id: GENRE_IDS.ACTION, name: "Ação", icon: "⚔️" },
  { id: GENRE_IDS.ADVENTURE, name: "Aventura", icon: "🗺️" },
  { id: GENRE_IDS.COMEDY, name: "Comédia", icon: "😄" },
  { id: GENRE_IDS.DRAMA, name: "Drama", icon: "🎭" },
  { id: GENRE_IDS.FANTASY, name: "Fantasia", icon: "🧙" },
  { id: GENRE_IDS.ROMANCE, name: "Romance", icon: "💕" },
  { id: GENRE_IDS.SCI_FI, name: "Sci-Fi", icon: "🚀" },
  { id: GENRE_IDS.SLICE_OF_LIFE, name: "Slice of Life", icon: "☀️" },
  { id: GENRE_IDS.SPORTS, name: "Esportes", icon: "⚽" },
  { id: GENRE_IDS.SUPERNATURAL, name: "Sobrenatural", icon: "👻" },
  { id: GENRE_IDS.THRILLER, name: "Thriller", icon: "😱" },
  { id: GENRE_IDS.MYSTERY, name: "Mistério", icon: "🔍" },
]

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [genreAnimes, setGenreAnimes] = useState<AnimeData[]>([])
  const [isLoadingGenre, setIsLoadingGenre] = useState(false)
  const [randomAnime, setRandomAnime] = useState<AnimeData | null>(null)
  const [isLoadingRandom, setIsLoadingRandom] = useState(false)

  const debouncedQuery = useDebounce(searchQuery, 400)
  const { results: searchResults, isLoading: isSearching } = useAnimeSearch(debouncedQuery, 20)
  const { animes: topAnimes, isLoading: isLoadingTop } = useTopAnime(12)
  const { animes: popularAnimes, isLoading: isLoadingPopular } = usePopularAnime(12)

  const handleGenreSelect = async (genreId: number) => {
    if (selectedGenre === genreId) {
      setSelectedGenre(null)
      setGenreAnimes([])
      return
    }
    
    setSelectedGenre(genreId)
    setIsLoadingGenre(true)
    try {
      const animes = await fetchAnimeByGenre(genreId, 20)
      setGenreAnimes(animes)
    } catch (error) {
      console.error("Error fetching genre:", error)
    } finally {
      setIsLoadingGenre(false)
    }
  }

  const handleRandomAnime = async () => {
    setIsLoadingRandom(true)
    try {
      const anime = await fetchRandomAnime()
      setRandomAnime(anime)
    } catch (error) {
      console.error("Error fetching random:", error)
    } finally {
      setIsLoadingRandom(false)
    }
  }

  const showSearchResults = searchQuery.length > 0
  const showGenreResults = selectedGenre !== null && !showSearchResults

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border">
        <div className="container mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Descobrir</h1>
              <p className="text-sm text-muted-foreground">Explore novos animes</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRandomAnime}
              disabled={isLoadingRandom}
              className="hidden sm:flex"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Aleatório
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar animes por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-lg bg-secondary border-border"
          />
        </div>

        {/* Random Anime Result */}
        {randomAnime && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Anime Aleatório</h2>
              <Button variant="ghost" size="sm" onClick={() => setRandomAnime(null)}>
                Fechar
              </Button>
            </div>
            <RandomAnimeCard anime={randomAnime} />
          </div>
        )}

        {/* Genre Filter */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Filtrar por Gênero</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <Button
                key={genre.id}
                variant={selectedGenre === genre.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleGenreSelect(genre.id)}
                className={selectedGenre === genre.id ? "bg-primary text-primary-foreground" : ""}
              >
                <span className="mr-1">{genre.icon}</span>
                {genre.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <Section 
            title="Resultados da Busca"
            subtitle={`${searchResults.length} resultados para "${searchQuery}"`}
            icon={<Search className="w-5 h-5" />}
            animes={searchResults}
            isLoading={isSearching}
          />
        )}

        {/* Genre Results */}
        {showGenreResults && (
          <Section 
            title={`Gênero: ${GENRES.find(g => g.id === selectedGenre)?.name}`}
            subtitle={`${genreAnimes.length} animes encontrados`}
            icon={<Filter className="w-5 h-5" />}
            animes={genreAnimes}
            isLoading={isLoadingGenre}
          />
        )}

        {/* Default Sections */}
        {!showSearchResults && !showGenreResults && (
          <>
            <Section 
              title="Em Alta"
              subtitle="Os mais populares da temporada"
              icon={<TrendingUp className="w-5 h-5 text-primary" />}
              animes={topAnimes}
              isLoading={isLoadingTop}
            />

            <Section 
              title="Mais Amados"
              subtitle="Favoritos da comunidade"
              icon={<Heart className="w-5 h-5 text-red-500" />}
              animes={popularAnimes}
              isLoading={isLoadingPopular}
            />
          </>
        )}
      </div>
    </div>
  )
}

function Section({ 
  title, 
  subtitle, 
  icon, 
  animes, 
  isLoading 
}: { 
  title: string
  subtitle: string
  icon: React.ReactNode
  animes: AnimeData[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-lg overflow-hidden animate-pulse">
              <div className="aspect-[2/3] bg-secondary/50" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-secondary/50 rounded w-3/4" />
                <div className="h-3 bg-secondary/50 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {animes.map((anime) => (
          <DiscoverCard key={anime.id} anime={anime} />
        ))}
      </div>
    </div>
  )
}

function DiscoverCard({ anime }: { anime: AnimeData }) {
  return (
    <div className="group relative glass-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all">
      <div className="aspect-[2/3] relative">
        <Image
          src={anime.image}
          alt={anime.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        {/* Score badge */}
        {anime.score > 0 && (
          <Badge className="absolute top-2 right-2 bg-background/80 text-foreground">
            <Star className="w-3 h-3 mr-1 text-yellow-400 fill-yellow-400" />
            {anime.score.toFixed(1)}
          </Badge>
        )}

        {/* Status badge */}
        {anime.status && (
          <Badge 
            variant="outline" 
            className="absolute top-2 left-2 bg-background/80 text-xs border-primary/50"
          >
            {anime.status}
          </Badge>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="icon" className="bg-primary text-primary-foreground w-10 h-10">
            <Play className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="outline" className="w-10 h-10">
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground line-clamp-2">{anime.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {anime.year} • {anime.episodes || "?"} eps
        </p>
        {anime.genres && anime.genres.length > 0 && (
          <p className="text-xs text-muted-foreground/70 mt-1 truncate">
            {anime.genres.slice(0, 2).join(", ")}
          </p>
        )}
      </div>
    </div>
  )
}

function RandomAnimeCard({ anime }: { anime: AnimeData }) {
  return (
    <div className="glass-card rounded-lg border border-primary/30 overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-48 aspect-[2/3] md:aspect-auto relative">
          <Image
            src={anime.image}
            alt={anime.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground">{anime.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {anime.year} • {anime.episodes || "?"} episódios • {anime.studio}
              </p>
            </div>
            {anime.score > 0 && (
              <Badge className="bg-primary text-primary-foreground">
                <Star className="w-3 h-3 mr-1 fill-current" />
                {anime.score.toFixed(1)}
              </Badge>
            )}
          </div>
          
          {anime.genres && (
            <div className="flex flex-wrap gap-1 mt-3">
              {anime.genres.slice(0, 4).map((genre) => (
                <Badge key={genre} variant="outline" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-4 line-clamp-3">
            {anime.synopsis}
          </p>

          <div className="flex gap-2 mt-4">
            <Button className="bg-primary text-primary-foreground">
              <Play className="w-4 h-4 mr-2" />
              Assistir
            </Button>
            <Button variant="outline">
              <Info className="w-4 h-4 mr-2" />
              Detalhes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
