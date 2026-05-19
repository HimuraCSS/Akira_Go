"use client"

import { Play, Settings, Star, Calendar, Tv, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface HeroSectionProps {
  onOpenAddons: () => void
}

export function HeroSection({ onOpenAddons }: HeroSectionProps) {
  return (
    <section className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-2xl space-y-6">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
                <Star className="w-3 h-3 mr-1 fill-primary" />
                9.1 Score
              </Badge>
              <Badge variant="outline" className="border-border text-muted-foreground">
                <Calendar className="w-3 h-3 mr-1" />
                2024
              </Badge>
              <Badge variant="outline" className="border-border text-muted-foreground">
                <Tv className="w-3 h-3 mr-1" />
                24 Episódios
              </Badge>
              <Badge variant="outline" className="border-border text-muted-foreground">
                <Clock className="w-3 h-3 mr-1" />
                24min/ep
              </Badge>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-balance">
              <span className="gradient-text">Cyberpunk</span>
              <br />
              <span className="text-foreground">Edgerunners</span>
            </h1>

            {/* Studio */}
            <p className="text-muted-foreground text-sm uppercase tracking-widest">
              Studio Trigger • Netflix Original
            </p>

            {/* Synopsis */}
            <p className="text-muted-foreground text-base leading-relaxed max-w-xl">
              Em uma distopia dominada por corporações e obsessão por tecnologia, um jovem delinquente de rua tenta sobreviver em Night City, uma cidade que vive da modificação corporal.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Button 
                size="lg" 
                className="glow-effect bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-lg"
              >
                <Play className="w-5 h-5 mr-2 fill-current" />
                Assistir Agora
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-border hover:border-primary/50 hover:bg-primary/10 px-8 py-6 text-lg"
                onClick={onOpenAddons}
              >
                <Settings className="w-5 h-5 mr-2" />
                Gerenciar Add-ons
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6 pt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-muted-foreground">3 Fontes Ativas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">HLS Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
