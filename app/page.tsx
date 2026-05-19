"use client"

import { useState, lazy, Suspense, useRef, useEffect } from "react"
import Image from "next/image"
import { Header } from "@/components/anitracker/header"
import { HeroSection } from "@/components/anitracker/hero-section"
import { StreamingProvider, useStreaming } from "@/components/anitracker/streaming-context"
import type { AnimeData } from "@/components/anitracker/anime-card"

// Lazy load components below the fold for better initial load performance
const StatsCard = lazy(() => import("@/components/anitracker/stats-card").then(m => ({ default: m.StatsCard })))
const ProvidersCard = lazy(() => import("@/components/anitracker/providers-card").then(m => ({ default: m.ProvidersCard })))
const TrackingCard = lazy(() => import("@/components/anitracker/tracking-card").then(m => ({ default: m.TrackingCard })))
const AnimeCarousel = lazy(() => import("@/components/anitracker/anime-carousel").then(m => ({ default: m.AnimeCarousel })))
const VideoPlayer = lazy(() => import("@/components/anitracker/video-player").then(m => ({ default: m.VideoPlayer })))
const AddonsModal = lazy(() => import("@/components/anitracker/addons-modal").then(m => ({ default: m.AddonsModal })))

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

// Simulated API data - Replace with real API calls
const mockFeaturedAnime: AnimeData = {
  id: "cyberpunk-edgerunners",
  title: "Cyberpunk: Edgerunners",
  japaneseTitle: "サイバーパンク エッジランナーズ",
  image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80",
  bannerImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80",
  score: 9.1,
  episodes: 10,
  status: "Completed",
  synopsis: "Em uma distopia dominada por corporações e obsessão por tecnologia, um jovem delinquente de rua tenta sobreviver em Night City, uma cidade que vive da modificação corporal.",
  genres: ["Ação", "Sci-Fi", "Cyberpunk"],
  year: 2022,
  studio: "Studio Trigger",
  duration: "24min/ep",
}

const mockTrendingAnimes: AnimeData[] = [
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

const continueWatchingData = [
  { id: "cw-1", title: "Cyberpunk: Edgerunners", episode: 8, progress: 65, image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80" },
  { id: "cw-2", title: "Solo Leveling", episode: 5, progress: 30, image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&q=80" },
  { id: "cw-3", title: "Demon Slayer S4", episode: 3, progress: 80, image: "https://images.unsplash.com/photo-1614583225154-5fcdda07019e?w=400&q=80" },
  { id: "cw-4", title: "Jujutsu Kaisen", episode: 12, progress: 45, image: "https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?w=400&q=80" },
]

function AniTrackerContent() {
  const [addonsModalOpen, setAddonsModalOpen] = useState(false)
  const videoPlayerRef = useRef<HTMLDivElement>(null)
  const { playEpisode } = useStreaming()

  // Simulated loading states - Replace with real data fetching
  const [featuredAnime, setFeaturedAnime] = useState<AnimeData | null>(null)
  const [trendingAnimes, setTrendingAnimes] = useState<AnimeData[]>([])
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true)
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)

  // Simulate data fetching
  useEffect(() => {
    // Simulate API delay for featured anime
    const featuredTimer = setTimeout(() => {
      setFeaturedAnime(mockFeaturedAnime)
      setIsLoadingFeatured(false)
    }, 800)

    // Simulate API delay for trending animes
    const trendingTimer = setTimeout(() => {
      setTrendingAnimes(mockTrendingAnimes)
      setIsLoadingTrending(false)
    }, 1200)

    return () => {
      clearTimeout(featuredTimer)
      clearTimeout(trendingTimer)
    }
  }, [])

  const scrollToPlayer = () => {
    setTimeout(() => {
      videoPlayerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  const handlePlayAnime = (anime: AnimeData) => {
    const episode = {
      id: `${anime.id}-ep-1`,
      number: 1,
      title: "Episódio 1",
      thumbnail: anime.image,
      duration: anime.duration || "24:00",
      animeId: anime.id,
      animeTitle: anime.title,
    }
    
    playEpisode(episode)
    scrollToPlayer()
  }

  const handleAnimeInfo = (anime: AnimeData) => {
    // Could open a modal or navigate to detail page
    console.log("Info for:", anime.title)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section - Dynamic with loading state */}
        <HeroSection 
          anime={featuredAnime ?? undefined}
          isLoading={isLoadingFeatured}
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

        {/* Trending Anime Carousel - Dynamic with loading state */}
        <Suspense fallback={<SectionSkeleton />}>
          <AnimeCarousel 
            title="Em Alta"
            subtitle="Os animes mais populares da temporada"
            animes={trendingAnimes}
            isLoading={isLoadingTrending}
            onPlayAnime={handlePlayAnime}
            onAnimeInfo={handleAnimeInfo}
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
  return (
    <section className="py-8">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Continuar Assistindo</h2>
          <p className="text-sm text-muted-foreground">Retome de onde parou</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {continueWatchingData.map((anime) => (
            <ContinueWatchingCard key={anime.id} anime={anime} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ContinueWatchingCard({ anime }: { anime: typeof continueWatchingData[0] }) {
  return (
    <div className="group relative glass-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all cursor-pointer">
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
        <p className="text-xs text-muted-foreground">EP {anime.episode} • {anime.progress}% assistido</p>
      </div>

      {/* Play overlay on hover */}
      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default function AniTrackerPage() {
  return (
    <StreamingProvider>
      <AniTrackerContent />
    </StreamingProvider>
  )
}
