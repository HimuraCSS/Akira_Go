"use client"

import { useState, lazy, Suspense, useRef } from "react"
import Image from "next/image"
import { Header } from "@/components/anitracker/header"
import { HeroSection } from "@/components/anitracker/hero-section"
import { StreamingProvider } from "@/components/anitracker/streaming-context"

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

const continueWatchingData = [
  { id: "cw-1", title: "Cyberpunk: Edgerunners", episode: 8, progress: 65, image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80" },
  { id: "cw-2", title: "Solo Leveling", episode: 5, progress: 30, image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&q=80" },
  { id: "cw-3", title: "Demon Slayer S4", episode: 3, progress: 80, image: "https://images.unsplash.com/photo-1614583225154-5fcdda07019e?w=400&q=80" },
  { id: "cw-4", title: "Jujutsu Kaisen", episode: 12, progress: 45, image: "https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?w=400&q=80" },
]

function AniTrackerContent() {
  const [addonsModalOpen, setAddonsModalOpen] = useState(false)
  const videoPlayerRef = useRef<HTMLDivElement>(null)

  const scrollToPlayer = () => {
    // Small delay to allow the player to initialize
    setTimeout(() => {
      videoPlayerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section - Above the fold, loads immediately */}
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

        {/* Trending Anime Carousel - Lazy loaded */}
        <Suspense fallback={<SectionSkeleton />}>
          <AnimeCarousel />
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
