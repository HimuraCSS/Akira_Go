"use client"

import { useRef, useEffect, useState } from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Subtitles,
  Gauge,
  MonitorPlay,
  ChevronDown,
  Loader2,
  Settings,
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
import { useStreaming } from "./streaming-context"

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const {
    currentEpisode,
    currentSource,
    availableSources,
    isPlaying,
    isBuffering,
    hlsReady,
    switchSource,
    setIsPlaying,
    activeProvider,
    providers,
  } = useStreaming()

  const activeProviderData = providers.find(p => p.id === activeProvider)

  // Handle video events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setProgress((video.currentTime / video.duration) * 100 || 0)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
    }
  }, [setIsPlaying])

  // Update volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100
    }
  }, [volume, isMuted])

  // Update playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const handleSeek = (value: number[]) => {
    if (videoRef.current && duration) {
      videoRef.current.currentTime = (value[0] / 100) * duration
      setProgress(value[0])
    }
  }

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const currentTime = duration ? (progress / 100) * duration : 0

  // Display info
  const displayTitle = currentEpisode?.animeTitle || "Cyberpunk: Edgerunners"
  const displayEpisode = currentEpisode ? `Episódio ${currentEpisode.number}` : "Episódio 8"
  const displaySourceName = currentSource?.name || activeProviderData?.name || "Consumet API"
  const displayQuality = currentSource?.quality || "1080p"

  return (
    <section className="py-8">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-foreground">Player de Vídeo</h2>
          <p className="text-sm text-muted-foreground">{displayTitle} - {displayEpisode}</p>
        </div>

        {/* Video Container */}
        <div 
          ref={containerRef}
          className="relative aspect-video rounded-xl overflow-hidden glass-card neon-border group"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(isPlaying ? false : true)}
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover bg-black"
            poster="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80"
            playsInline
          >
            <source src={currentSource?.url || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"} type="application/x-mpegURL" />
          </video>

          {/* Current Source Indicator */}
          <div className={`absolute top-4 left-4 flex items-center gap-2 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
            <Badge className="bg-background/80 backdrop-blur-sm text-foreground border border-primary/30">
              {isBuffering ? (
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              )}
              {displaySourceName} • {displayQuality}
            </Badge>
            <Badge className="bg-background/80 backdrop-blur-sm text-muted-foreground border-none">
              {hlsReady ? "HLS Stream" : "Carregando..."}
            </Badge>
          </div>

          {/* Buffering Overlay */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <span className="text-sm text-foreground">Carregando stream...</span>
              </div>
            </div>
          )}

          {/* Center Play Button (when paused) */}
          {!isPlaying && !isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                size="lg"
                className="w-20 h-20 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground glow-effect"
                onClick={togglePlay}
              >
                <Play className="w-8 h-8 ml-1" />
              </Button>
            </div>
          )}

          {/* Bottom Controls */}
          <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/80 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
            {/* Progress Bar */}
            <div className="mb-4">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
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
                  onClick={togglePlay}
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
                  {displayEpisode} de 10
                </span>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1">
                {/* Source Switcher - FUNCTIONAL */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-foreground hover:text-primary gap-2">
                      <MonitorPlay className="w-4 h-4" />
                      <span className="text-xs hidden sm:inline">Fonte</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 bg-card border-border">
                    <DropdownMenuLabel className="text-muted-foreground">
                      Trocar Fonte de Streaming
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    {availableSources.length > 0 ? (
                      availableSources.map((source) => (
                        <DropdownMenuItem
                          key={source.id}
                          className={`cursor-pointer ${
                            currentSource?.id === source.id ? "bg-primary/10 text-primary" : ""
                          }`}
                          onClick={() => switchSource(source.id)}
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
                      ))
                    ) : (
                      <DropdownMenuItem disabled className="text-muted-foreground">
                        Nenhuma fonte disponível
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-border" />
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Provedor: {activeProviderData?.name || "Nenhum"}
                    </div>
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
                      <DropdownMenuItem 
                        key={speed} 
                        className={`cursor-pointer ${playbackSpeed === speed ? "bg-primary/10 text-primary" : ""}`}
                        onClick={() => setPlaybackSpeed(speed)}
                      >
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-foreground hover:text-primary"
                  onClick={handleFullscreen}
                >
                  <Maximize className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Player Info */}
        <div className="mt-4 p-4 glass-card rounded-lg border border-border">
          <div className="flex items-center justify-between text-sm flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-muted-foreground">
                Fonte atual: <span className="text-foreground font-medium">{displaySourceName}</span>
              </span>
              <span className="text-muted-foreground">
                Qualidade: <span className="text-foreground font-medium">{displayQuality}</span>
              </span>
              <span className="text-muted-foreground">
                Provedor: <span className="text-foreground font-medium">{activeProviderData?.name || "Nenhum"}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${hlsReady ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
              {hlsReady ? "CORS Proxy Ativo • HLS Ready" : "Inicializando HLS..."}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
