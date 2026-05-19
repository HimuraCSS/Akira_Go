"use client"

import { useState } from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Maximize,
  SkipBack,
  SkipForward,
  Subtitles,
  Gauge,
  MonitorPlay,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Source {
  id: string
  name: string
  quality: string
  status: "active" | "buffering" | "error"
}

const sources: Source[] = [
  { id: "consumet", name: "Consumet API", quality: "1080p", status: "active" },
  { id: "gogoanime", name: "GogoAnime", quality: "720p", status: "active" },
  { id: "zoro", name: "Zoro/Anicrush", quality: "1080p", status: "buffering" },
]

export function VideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(35)
  const [volume, setVolume] = useState(80)
  const [currentSource, setCurrentSource] = useState(sources[0])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-foreground">Player de Vídeo</h2>
          <p className="text-sm text-muted-foreground">Cyberpunk: Edgerunners - Episódio 8</p>
        </div>

        {/* Video Container */}
        <div className="relative aspect-video rounded-xl overflow-hidden glass-card neon-border">
          {/* Video Background (Placeholder) */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80')`,
            }}
          >
            <div className="absolute inset-0 bg-background/40" />
          </div>

          {/* Current Source Indicator */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Badge className="bg-background/80 backdrop-blur-sm text-foreground border border-primary/30">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              {currentSource.name} • {currentSource.quality}
            </Badge>
            <Badge className="bg-background/80 backdrop-blur-sm text-muted-foreground border-none">
              HLS Stream
            </Badge>
          </div>

          {/* Center Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size="lg"
              className="w-20 h-20 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground glow-effect"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/80 to-transparent">
            {/* Progress Bar */}
            <div className="mb-4">
              <Slider
                value={[progress]}
                onValueChange={(value) => setProgress(value[0])}
                max={100}
                step={0.1}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatTime(Math.floor((progress / 100) * 1440))}</span>
                <span>24:00</span>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground hover:text-primary"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
                  <SkipBack className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
                  <SkipForward className="w-5 h-5" />
                </Button>

                {/* Volume */}
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-foreground hover:text-primary"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    onValueChange={(value) => {
                      setVolume(value[0])
                      setIsMuted(value[0] === 0)
                    }}
                    max={100}
                    className="w-24"
                  />
                </div>

                <span className="text-sm text-muted-foreground ml-4">
                  Episódio 8 de 10
                </span>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1">
                {/* Source Switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-foreground hover:text-primary gap-2">
                      <MonitorPlay className="w-4 h-4" />
                      <span className="text-xs">Fonte</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                    <DropdownMenuLabel className="text-muted-foreground">
                      Trocar Fonte de Streaming
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    {sources.map((source) => (
                      <DropdownMenuItem
                        key={source.id}
                        className={`cursor-pointer ${
                          currentSource.id === source.id ? "bg-primary/10 text-primary" : ""
                        }`}
                        onClick={() => setCurrentSource(source)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              source.status === "active" ? "bg-green-500" :
                              source.status === "buffering" ? "bg-yellow-500 animate-pulse" :
                              "bg-destructive"
                            }`} />
                            <span>{source.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs border-border">
                            {source.quality}
                          </Badge>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Speed */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
                      <Gauge className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuLabel className="text-muted-foreground">Velocidade</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <DropdownMenuItem key={speed} className="cursor-pointer">
                        {speed}x {speed === 1 && "(Normal)"}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Subtitles */}
                <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
                  <Subtitles className="w-5 h-5" />
                </Button>

                {/* Settings */}
                <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
                  <Settings className="w-5 h-5" />
                </Button>

                {/* Fullscreen */}
                <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
                  <Maximize className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Player Info */}
        <div className="mt-4 p-4 glass-card rounded-lg border border-border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                Fonte atual: <span className="text-foreground font-medium">{currentSource.name}</span>
              </span>
              <span className="text-muted-foreground">
                Qualidade: <span className="text-foreground font-medium">{currentSource.quality}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              CORS Proxy Ativo • HLS Seleção Automática
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
