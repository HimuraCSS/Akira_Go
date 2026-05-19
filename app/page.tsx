"use client"

import { useState } from "react"
import { Header } from "@/components/anitracker/header"
import { HeroSection } from "@/components/anitracker/hero-section"
import { StatsCard } from "@/components/anitracker/stats-card"
import { ProvidersCard } from "@/components/anitracker/providers-card"
import { TrackingCard } from "@/components/anitracker/tracking-card"
import { AnimeCarousel } from "@/components/anitracker/anime-carousel"
import { VideoPlayer } from "@/components/anitracker/video-player"
import { AddonsModal } from "@/components/anitracker/addons-modal"

export default function AniTrackerPage() {
  const [addonsModalOpen, setAddonsModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section */}
        <HeroSection onOpenAddons={() => setAddonsModalOpen(true)} />

        {/* Bento Dashboard */}
        <section className="py-8 -mt-20 relative z-20">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatsCard />
              <ProvidersCard />
              <TrackingCard />
            </div>
          </div>
        </section>

        {/* Trending Anime Carousel */}
        <AnimeCarousel />

        {/* Video Player Section */}
        <VideoPlayer />

        {/* Continue Watching Section */}
        <section className="py-8">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Continuar Assistindo</h2>
              <p className="text-sm text-muted-foreground">Retome de onde parou</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Cyberpunk: Edgerunners", episode: "EP 8", progress: 65, image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80" },
                { title: "Solo Leveling", episode: "EP 5", progress: 30, image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&q=80" },
                { title: "Demon Slayer S4", episode: "EP 3", progress: 80, image: "https://images.unsplash.com/photo-1614583225154-5fcdda07019e?w=400&q=80" },
                { title: "Jujutsu Kaisen", episode: "EP 12", progress: 45, image: "https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?w=400&q=80" },
              ].map((anime, index) => (
                <div
                  key={index}
                  className="group relative glass-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all cursor-pointer"
                >
                  <div className="aspect-video relative">
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${anime.image}')` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                    </div>
                    
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
                    <p className="text-xs text-muted-foreground">{anime.episode} • {anime.progress}% assistido</p>
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
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-border">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-foreground">AniTracker</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <a href="#" className="hover:text-primary transition-colors">Sobre</a>
                <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
                <a href="#" className="hover:text-primary transition-colors">Termos</a>
                <a href="#" className="hover:text-primary transition-colors">Contato</a>
              </div>
              <p className="text-xs text-muted-foreground">
                © 2024 AniTracker. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* Addons Modal */}
      <AddonsModal open={addonsModalOpen} onOpenChange={setAddonsModalOpen} />
    </div>
  )
}
