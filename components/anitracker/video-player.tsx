"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import Hls from "hls.js"
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
  AlertCircle,
  X,
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
  const hlsRef = useRef<Hls | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [hlsError, setHlsError] = useState<string | null>(null)

  const {
    currentAnime,
    currentEpisode,
    currentSource,
    availableSources,
    streamUrl,
    isPlaying,
    isBuffering,
    hlsReady,
    isLoadingStream,
    error,
    switchSource,
    setIsPlaying,
    setIsBuffering,
    setHlsReady,
    playEpisodeByNumber,
    activeProvider,
    providers,
    clearError,
  } = useStreaming()

  const activeProviderData = providers.find(p => p.id === activeProvider)

  // Initialize HLS.js when stream URL changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !streamUrl) return

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    setHlsError(null)

    // Check if the source is HLS (m3u8)
    const isHLS = currentSource?.isM3U8 || streamUrl.includes(".m3u8")

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      })

      hls.loadSource(streamUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setHlsReady(true)
        setIsBuffering(false)
        video.play().catch(() => {
          // Autoplay blocked, user needs to click play
          setIsPlaying(false)
        })
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setHlsError("Erro de rede - tentando reconectar...")
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              setHlsError("Erro de mídia - recuperando...")
              hls.recoverMediaError()
              break
            default:
              setHlsError("Erro fatal no stream")
              hls.destroy()
              break
          }
        }
      })

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setIsBuffering(false)
      })

      hlsRef.current = hls
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      video.src = streamUrl
      video.addEventListener("loadedmetadata", () => {
        setHlsReady(true)
        setIsBuffering(false)
        video.play().catch(() => setIsPlaying(false))
      })
    } else if (!isHLS) {
      // Direct MP4 or other format
      video.src = streamUrl
      video.addEventListener("loadedmetadata", () => {
        setHlsReady(true)
        setIsBuffering(false)
        video.play().catch(() => setIsPlaying(false))
      })
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [streamUrl, currentSource?.isM3U8, setHlsReady, setIsBuffering, setIsPlaying])

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
    const handleWaiting = () => setIsBuffering(true)
    const handlePlaying = () => setIsBuffering(false)

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("playing", handlePlaying)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("playing", handlePlaying)
    }
  }, [setIsPlaying, setIsBuffering])

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

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }, [isPlaying])

  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current && duration) {
      videoRef.current.currentTime = (value[0] / 100) * duration
      setProgress(value[0])
    }
  }, [duration])

  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }, [])

  const handlePreviousEpisode = useCallback(() => {
    if (currentEpisode && currentEpisode.number > 1) {
      playEpisodeByNumber(currentEpisode.number - 1)
    }
  }, [currentEpisode, playEpisodeByNumber])

  const handleNextEpisode = useCallback(() => {
    if (currentEpisode && currentAnime && currentEpisode.number < currentAnime.totalEpisodes) {
      playEpisodeByNumber(currentEpisode.number + 1)
    }
  }, [currentEpisode, currentAnime, playEpisodeByNumber])

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const currentTime = duration ? (progress / 100) * duration : 0

  // Display info
  const displayTitle = currentEpisode?.animeTitle || currentAnime?.animeTitle || "Selecione um anime"
  const displayEpisode = currentEpisode ? `Episódio ${currentEpisode.number}` : "Nenhum episódio selecionado"
  const displaySourceName = currentSource?.name || activeProviderData?.name || "Consumet API"
  const displayQuality = currentSource?.quality || "Auto"
  const totalEpisodes = currentAnime?.totalEpisodes || "?"

  const showError = error || hlsError

  return (
    <section className="py-8">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-foreground">Player de Vídeo</h2>
          <p className="text-sm text-muted-foreground">{displayTitle} - {displayEpisode}</p>
        </div>

        {/* Error Banner */}
        {showError && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span className="text-sm text-destructive">{error || hlsError}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                clearError()
                setHlsError(null)
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

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
            className="absolute inset-0 w-full h-full object-contain bg-black"
            poster={currentEpisode?.thumbnail || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80"}
            playsInline
            crossOrigin="anonymous"
          >
            {/* Subtitle Track */}
            {activeSubtitle && activeSubtitle.url && (
              <track
                kind="subtitles"
                src={activeSubtitle.url}
                srcLang={activeSubtitle.lang.toLowerCase().includes('portuguese') ? 'pt-BR' : 'en'}
                label={activeSubtitle.lang}
                default
              />
            )}
          </video>

          {/* Current Source Indicator */}
          <div className={`absolute top-4 left-4 flex items-center gap-2 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
            <Badge className="bg-background/80 backdrop-blur-sm text-foreground border border-primary/30">
              {isBuffering || isLoadingStream ? (
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              )}
              {displaySourceName} • {displayQuality}
            </Badge>
            <Badge className="bg-background/80 backdrop-blur-sm text-muted-foreground border-none">
              {hlsReady ? "HLS Stream" : isLoadingStream ? "Carregando..." : "Aguardando"}
            </Badge>
          </div>

          {/* Buffering Overlay */}
          {(isBuffering || isLoadingStream) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <span className="text-sm text-foreground">
                  {isLoadingStream ? "Buscando fontes de streaming..." : "Carregando stream..."}
                </span>
              </div>
            </div>
          )}

          {/* Center Play Button (when paused and not loading) */}
          {!isPlaying && !isBuffering && !isLoadingStream && streamUrl && (
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

          {/* No Stream Selected Overlay */}
          {!streamUrl && !isLoadingStream && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <div className="text-center">
                <MonitorPlay className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-foreground mb-2">Nenhum episódio selecionado</p>
                <p className="text-sm text-muted-foreground">
                  Selecione um episódio abaixo ou clique em &quot;Assistir Agora&quot; em um anime
                </p>
              </div>
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
                disabled={!streamUrl}
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
                  disabled={!streamUrl}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-foreground hover:text-primary"
                  onClick={handlePreviousEpisode}
                  disabled={!currentEpisode || currentEpisode.number <= 1}
                >
                  <SkipBack className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-foreground hover:text-primary"
                  onClick={handleNextEpisode}
                  disabled={!currentEpisode || !currentAnime || currentEpisode.number >= currentAnime.totalEpisodes}
                >
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
                  {displayEpisode} de {totalEpisodes}
                </span>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1">
                {/* Source Switcher */}
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
                        Selecione um episódio primeiro
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className={`text-foreground hover:text-primary gap-2 ${activeSubtitle ? "text-primary" : ""}`}>
                      <Subtitles className="w-4 h-4" />
                      <span className="text-xs hidden sm:inline">
                        {activeSubtitle ? "PT-BR" : "Legenda"}
                      </span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 bg-card border-border">
                    <DropdownMenuLabel className="text-muted-foreground">
                      Legendas
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      className={`cursor-pointer ${!activeSubtitle ? "bg-primary/10 text-primary" : ""}`}
                      onClick={() => setActiveSubtitle(null)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${!activeSubtitle ? "bg-primary" : "bg-muted"}`} />
                        <span>Desativadas</span>
                      </div>
                    </DropdownMenuItem>
                    {subtitles.length > 0 ? (
                      <>
                        {/* PT-BR first if available */}
                        {subtitles.filter(s => 
                          s.lang.toLowerCase().includes('portuguese') || 
                          s.lang.toLowerCase().includes('pt')
                        ).map((sub, index) => (
                          <DropdownMenuItem
                            key={`ptbr-${index}`}
                            className={`cursor-pointer ${activeSubtitle?.url === sub.url ? "bg-primary/10 text-primary" : ""}`}
                            onClick={() => setActiveSubtitle(sub)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${activeSubtitle?.url === sub.url ? "bg-primary" : "bg-green-500"}`} />
                                <span>{sub.lang}</span>
                              </div>
                              <Badge className="bg-green-500/20 text-green-400 border-none text-xs">
                                PT-BR
                              </Badge>
                            </div>
                          </DropdownMenuItem>
                        ))}
                        {/* Other languages */}
                        {subtitles.filter(s => 
                          !s.lang.toLowerCase().includes('portuguese') && 
                          !s.lang.toLowerCase().includes('pt')
                        ).slice(0, 5).map((sub, index) => (
                          <DropdownMenuItem
                            key={`sub-${index}`}
                            className={`cursor-pointer ${activeSubtitle?.url === sub.url ? "bg-primary/10 text-primary" : ""}`}
                            onClick={() => setActiveSubtitle(sub)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${activeSubtitle?.url === sub.url ? "bg-primary" : "bg-muted"}`} />
                              <span>{sub.lang}</span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </>
                    ) : (
                      <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                        {streamUrl ? "Nenhuma legenda disponível" : "Selecione um episódio primeiro"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-border" />
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      {subtitles.length} legendas disponíveis
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

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

        {/* Episode Selector Grid */}
        {currentAnime && currentAnime.episodes.length > 0 && (
          <EpisodeSelector />
        )}

        {/* Player Info */}
        <div className="mt-4 p-4 glass-card rounded-lg border border-border">
          <div className="flex items-center justify-between text-sm flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-muted-foreground">
                Fonte atual: <span className="text-foreground font-medium">{currentSource ? displaySourceName : "Nenhuma"}</span>
              </span>
              <span className="text-muted-foreground">
                Qualidade: <span className="text-foreground font-medium">{displayQuality}</span>
              </span>
              <span className="text-muted-foreground">
                Provedor: <span className="text-foreground font-medium">{activeProviderData?.name || "Nenhum"}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${hlsReady ? "bg-green-500" : streamUrl ? "bg-yellow-500 animate-pulse" : "bg-muted"}`} />
              {hlsReady ? "HLS Stream Ativo" : streamUrl ? "Inicializando HLS..." : "Aguardando seleção"}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Episode Selector Component
function EpisodeSelector() {
  const { 
    currentAnime, 
    currentEpisode, 
    playEpisodeByNumber, 
    isLoadingStream 
  } = useStreaming()

  if (!currentAnime) return null

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-foreground mb-3">
        Episódios de {currentAnime.animeTitle}
      </h3>
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-2">
        {currentAnime.episodes.map((episode) => {
          const isActive = currentEpisode?.number === episode.number
          const isLoading = isActive && isLoadingStream
          
          return (
            <Button
              key={episode.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className={`
                h-10 w-full font-medium transition-all
                ${isActive 
                  ? "bg-primary text-primary-foreground glow-effect" 
                  : "bg-card/50 border-border hover:border-primary/50 hover:bg-primary/10"
                }
              `}
              onClick={() => playEpisodeByNumber(episode.number)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                episode.number
              )}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
