"use client"

import { useState, lazy, Suspense, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { Header } from "@/components/anitracker/header"
import { HeroSection } from "@/components/anitracker/hero-section"
import { StreamingProvider, useStreaming } from "@/components/anitracker/streaming-context"
import { MALAuthProvider } from "@/components/anitracker/mal-auth-context"
import { useAuth } from "@/contexts/auth-context"
import type { AnimeData } from "@/components/anitracker/anime-card"
import { useDashboardData, usePopularAnime } from "@/hooks/use-anime"

// Lazy load components below the fold for better initial load performance
const StatsCard = lazy(() => import("@/components/anitracker/stats-card").then(m => ({ default: m.StatsCard })))
const ProvidersCard = lazy(() => import("@/components/anitracker/providers-card").then(m => ({ default: m.ProvidersCard })))
const TrackingCard = lazy(() => import("@/components/anitracker/tracking-card").then(m => ({ default: m.TrackingCard })))
const AnimeCarousel = lazy(() => import("@/components/anitracker/anime-carousel").then(m => ({ default: m.AnimeCarousel })))
const VideoPlayer = lazy(() => import("@/components/anitracker/artplayer-video").then(m => ({ default: m.VideoPlayer })))
const AddonsModal = lazy(() => import("@/components/anitracker/addons-modal").then(m => ({ default: m.AddonsModal })))
const ContinueWatching = lazy(() => import("@/components/anitracker/continue-watching").then(m => ({ default: m.ContinueWatching })))

// Loading skeleton for lazy components
function CardSkeleton() {
  return (
    <div className="glass-card rounded-lg border border-border p-4 animate-pulse">
      <div className="h-6 bg-secondary/50 rounded w-3/4 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-secondary/50 rounded w-full" />
        <div className="h-4 bg-secondary/50 rounded w-5/6" />
        <div className="h-4 bg-secondary/50 rounded w-4/6" />
      </div>
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="py-8">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="h-8 bg-secondary/50 rounded w-48 mb-6 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-secondary/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

function AkiraGoContent() {
  const [addonsModalOpen, setAddonsModalOpen] = useState(false)
  const videoPlayerRef = useRef<HTMLDivElement>(null)
  const { loadAnimeEpisodes, playEpisode } = useStreaming()

  // Fetch real data from Jikan API using SWR hooks
  const { 
    featured, 
    trending, 
    airing, 
    popular, 
    upcoming,
    isLoading 
  } = useDashboardData()

  // Additional hook for "best rated" section
  const { animes: topRated, isLoading: isLoadingTopRated } = usePopularAnime(12)

  const scrollToPlayer = () => {
    setTimeout(() => {
      videoPlayerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  const handlePlayAnime = async (anime: AnimeData) => {
    // Load episodes first
    await loadAnimeEpisodes(anime.id, anime.title, anime.image)
    
    // Then play first episode
    const episode = {
      id: `${anime.id}-ep-1`,
      number: 1,
      title: "Episódio 1",
      thumbnail: anime.image,
      duration: anime.duration || "24:00",
      animeId: anime.id,
      animeTitle: anime.title,
    }
    
    await playEpisode(episode)
    scrollToPlayer()
  }

  const handleAnimeInfo = (anime: AnimeData) => {
    // In a real app, this would navigate to the anime detail page
    console.log("Info for:", anime.title)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section - Auto-rotating carousel with seasonal anime */}
        <HeroSection 
          onOpenAddons={() => setAddonsModalOpen(true)} 
          onWatchNow={scrollToPlayer}
        />

        {/* Bento Dashboard - Lazy loaded */}
        <section className="py-8 -mt-20 relative z-20">
          <div className="container mx-auto px-6 lg:px-8">
            <Suspense fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            }>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatsCard />
                <ProvidersCard />
                <TrackingCard />
              </div>
            </Suspense>
          </div>
        </section>

        {/* Continue Watching - from watch history */}
        <div className="container mx-auto px-6 lg:px-8">
          <Suspense fallback={null}>
            <ContinueWatching />
          </Suspense>
        </div>

        {/* Trending Anime - Real API data */}
        <Suspense fallback={<SectionSkeleton />}>
          <AnimeCarousel 
            title="Em Alta"
            subtitle="Os animes mais populares da temporada"
            animes={trending}
            isLoading={isLoading}
            onPlayAnime={handlePlayAnime}
            onAnimeInfo={handleAnimeInfo}
            sectionId="trending"
          />
        </Suspense>

        {/* Currently Airing - Real API data */}
        <Suspense fallback={<SectionSkeleton />}>
          <AnimeCarousel 
            title="Em Exibição"
            subtitle="Animes da temporada atual"
            animes={airing}
            isLoading={isLoading}
            onPlayAnime={handlePlayAnime}
            onAnimeInfo={handleAnimeInfo}
            sectionId="airing"
          />
        </Suspense>

        {/* Video Player Section - Lazy loaded */}
        <div ref={videoPlayerRef}>
          <Suspense fallback={
            <div className="py-8">
              <div className="container mx-auto px-6 lg:px-8">
                <div className="aspect-video bg-secondary/50 rounded-lg animate-pulse" />
              </div>
            </div>
          }>
            <VideoPlayer />
          </Suspense>
        </div>

        {/* Continue Watching Section */}
        <ContinueWatchingSection />

        {/* Popular Anime - Real API data */}
        <Suspense fallback={<SectionSkeleton />}>
          <AnimeCarousel 
            title="Mais Populares"
            subtitle="Os animes mais assistidos de todos os tempos"
            animes={popular}
            isLoading={isLoading}
            onPlayAnime={handlePlayAnime}
            onAnimeInfo={handleAnimeInfo}
            sectionId="popular"
          />
        </Suspense>

        {/* Top Rated Section - Real API data */}
        <Suspense fallback={<SectionSkeleton />}>
          <AnimeCarousel 
            title="Melhores Avaliados"
            subtitle="Obras-primas aclamadas pela comunidade"
            animes={topRated.filter(a => a.score >= 8.0).sort((a, b) => b.score - a.score)}
            isLoading={isLoadingTopRated}
            onPlayAnime={handlePlayAnime}
            onAnimeInfo={handleAnimeInfo}
            sectionId="top-rated"
          />
        </Suspense>

        {/* Upcoming Anime - Real API data */}
        <Suspense fallback={<SectionSkeleton />}>
          <AnimeCarousel 
            title="Em Breve"
            subtitle="Os próximos lançamentos mais aguardados"
            animes={upcoming}
            isLoading={isLoading}
            onPlayAnime={handlePlayAnime}
            onAnimeInfo={handleAnimeInfo}
            sectionId="upcoming"
          />
        </Suspense>

        {/* Footer */}
        <footer className="py-8 border-t border-border">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="AKIRA Go"
                  width={24}
                  height={24}
                  className="w-6 h-6 object-contain"
                />
                <span className="text-sm font-medium text-foreground">AKIRA Go</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <a href="#" className="hover:text-primary transition-colors">Sobre</a>
                <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
                <a href="#" className="hover:text-primary transition-colors">Termos</a>
                <a href="#" className="hover:text-primary transition-colors">Contato</a>
              </div>
              <p className="text-xs text-muted-foreground">
                © 2024 AKIRA Go. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* Addons Modal - Lazy loaded */}
      {addonsModalOpen && (
        <Suspense fallback={null}>
          <AddonsModal open={addonsModalOpen} onOpenChange={setAddonsModalOpen} />
        </Suspense>
      )}
    </div>
  )
}

function ContinueWatchingSection() {
  const { getContinueWatching, user, isGuest, saveWatchProgress } = useAuth()
  const { loadAnimeEpisodes, playEpisode } = useStreaming()
  const [continueWatchingList, setContinueWatchingList] = useState<ContinueWatchingAnime[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadContinueWatching = useCallback(async () => {
    setIsLoading(true)
    try {
      const history = await getContinueWatching()
      const formatted: ContinueWatchingAnime[] = history.map(entry => ({
        id: entry.id,
        animeId: entry.anime_id,
        title: entry.anime_title,
        episode: entry.episode_number,
        progress: entry.duration_seconds > 0 
          ? Math.round((entry.progress_seconds / entry.duration_seconds) * 100) 
          : 0,
        image: entry.poster_url || "/placeholder.jpg",
        progressSeconds: entry.progress_seconds,
        durationSeconds: entry.duration_seconds,
      }))
      setContinueWatchingList(formatted)
    } catch (error) {
      console.error("Failed to load continue watching:", error)
    } finally {
      setIsLoading(false)
    }
  }, [getContinueWatching])

  useEffect(() => {
    if (user || isGuest) {
      loadContinueWatching()
    } else {
      setIsLoading(false)
    }
  }, [user, isGuest, loadContinueWatching])

  const handleResume = async (anime: ContinueWatchingAnime) => {
    // Load anime episodes and resume playback
    await loadAnimeEpisodes(anime.animeId, anime.title, anime.image)
    
    const episode = {
      id: `${anime.animeId}-ep-${anime.episode}`,
      number: anime.episode,
      title: `Episodio ${anime.episode}`,
      thumbnail: anime.image,
      duration: "24:00",
      animeId: anime.animeId,
      animeTitle: anime.title,
    }
    
    await playEpisode(episode)
  }

  // Don't show section if not logged in/guest and no data
  if (!user && !isGuest) {
    return null
  }

  if (isLoading) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="mb-6">
            <div className="h-8 bg-secondary/50 rounded w-48 animate-pulse" />
            <div className="h-4 bg-secondary/50 rounded w-32 mt-2 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-video bg-secondary/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (continueWatchingList.length === 0) {
    return null
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Continuar Assistindo</h2>
          <p className="text-sm text-muted-foreground">Retome de onde parou</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {continueWatchingList.map((anime) => (
            <ContinueWatchingCard 
              key={anime.id} 
              anime={anime} 
              onResume={() => handleResume(anime)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

interface ContinueWatchingAnime {
  id: string
  animeId: string
  title: string
  episode: number
  progress: number
  image: string
  progressSeconds: number
  durationSeconds: number
}

function ContinueWatchingCard({ anime, onResume }: { anime: ContinueWatchingAnime; onResume: () => void }) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <button
      onClick={onResume}
      className="group relative glass-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all cursor-pointer text-left w-full"
    >
      <div className="aspect-video relative">
        <Image
          src={anime.image}
          alt={anime.title}
          fill
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${anime.progress}%` }}
          />
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground truncate">{anime.title}</h3>
        <p className="text-xs text-muted-foreground">
          EP {anime.episode} • {formatTime(anime.progressSeconds)} / {formatTime(anime.durationSeconds)}
        </p>
      </div>

      {/* Play overlay on hover */}
      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
          <svg className="w-5 h-5 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  )
}

export default function AkiraGoPage() {
  return (
    <MALAuthProvider>
      <StreamingProvider>
        <AkiraGoContent />
      </StreamingProvider>
    </MALAuthProvider>
  )
}
