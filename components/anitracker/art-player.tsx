"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import Artplayer from "artplayer"
import Hls from "hls.js"
import { useStreaming, type StreamSource, type Subtitle } from "./streaming-context"
import { 
  Play, 
  ChevronDown, 
  Loader2, 
  AlertCircle, 
  Tv, 
  SkipBack, 
  SkipForward,
  Settings,
  RefreshCw,
  X,
  Subtitles,
  Volume2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"

export function VideoPlayer() {
  const artRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<Artplayer | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  
  const {
    currentAnime,
    currentEpisode,
    currentSource,
    availableSources,
    streamUrl,
    isBuffering,
    isLoadingStream,
    error,
    subtitles,
    activeSubtitle,
    switchSource,
    setActiveSubtitle,
    setIsPlaying,
    setIsBuffering,
    setHlsReady,
    playEpisodeByNumber,
    activeProvider,
    providers,
    clearError,
  } = useStreaming()

  const [showEpisodes, setShowEpisodes] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)

  const activeProviderData = providers.find(p => p.id === activeProvider)

  // Initialize ArtPlayer when stream URL changes
  useEffect(() => {
    if (!artRef.current || !streamUrl) return

    // Cleanup previous instance
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const isHls = streamUrl.includes(".m3u8")

    // Create custom HLS playback function
    const playM3u8 = (video: HTMLVideoElement, url: string, art: Artplayer) => {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        })
        hlsRef.current = hls
        
        hls.loadSource(url)
        hls.attachMedia(video)
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setHlsReady(true)
          setIsBuffering(false)
          setPlayerError(null)
        })

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setPlayerError("Erro de rede - tentando reconectar...")
                hls.startLoad()
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                setPlayerError("Erro de mídia - recuperando...")
                hls.recoverMediaError()
                break
              default:
                setPlayerError("Erro ao carregar o vídeo")
                break
            }
          }
        })

        art.on("destroy", () => {
          hls.destroy()
        })
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url
      } else {
        setPlayerError("Seu navegador não suporta HLS")
      }
    }

    // Initialize ArtPlayer
    const art = new Artplayer({
      container: artRef.current,
      url: streamUrl,
      type: isHls ? "m3u8" : "auto",
      customType: isHls ? { m3u8: playM3u8 } : undefined,
      poster: currentEpisode?.thumbnail || "",
      volume: 0.7,
      isLive: false,
      muted: false,
      autoplay: true,
      autoMini: true,
      screenshot: true,
      setting: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: true,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: true,
      theme: "#FF2E2E",
      lang: "pt-br",
      moreVideoAttr: {
        crossOrigin: "anonymous",
      },
      subtitle: activeSubtitle ? {
        url: activeSubtitle.url,
        type: "vtt",
        encoding: "utf-8",
        style: {
          color: "#FFFFFF",
          fontSize: "24px",
          textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
        },
      } : undefined,
      settings: [
        {
          html: "Qualidade",
          tooltip: currentSource?.quality || "Auto",
          selector: availableSources.map((source, index) => ({
            default: source.id === currentSource?.id,
            html: source.quality,
            url: source.url,
            index,
          })),
          onSelect: function (item) {
            const source = availableSources[item.index]
            if (source) {
              switchSource(source.id)
            }
            return item.html
          },
        },
      ],
      controls: [
        {
          position: "right",
          html: '<span class="art-icon">CC</span>',
          tooltip: "Legendas",
          click: function () {
            // Toggle subtitles
            if (activeSubtitle) {
              setActiveSubtitle(null)
            } else if (subtitles.length > 0) {
              // Find PT-BR subtitle first
              const ptBr = subtitles.find(s => 
                s.lang.toLowerCase().includes("portuguese") || 
                s.lang.toLowerCase().includes("pt")
              )
              setActiveSubtitle(ptBr || subtitles[0])
            }
          },
        },
      ],
    })

    // Event listeners
    art.on("play", () => {
      setIsPlaying(true)
      setIsBuffering(false)
    })

    art.on("pause", () => {
      setIsPlaying(false)
    })

    art.on("waiting", () => {
      setIsBuffering(true)
    })

    art.on("playing", () => {
      setIsBuffering(false)
    })

    art.on("error", () => {
      setPlayerError("Erro ao reproduzir o vídeo")
    })

    playerRef.current = art

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [streamUrl, currentSource?.id])

  // Update subtitle when changed
  useEffect(() => {
    if (playerRef.current && activeSubtitle) {
      playerRef.current.subtitle.switch(activeSubtitle.url, {
        name: activeSubtitle.lang,
      })
    } else if (playerRef.current && !activeSubtitle) {
      playerRef.current.subtitle.show = false
    }
  }, [activeSubtitle])

  const handlePrevEpisode = useCallback(() => {
    if (currentEpisode && currentEpisode.number > 1) {
      playEpisodeByNumber(currentEpisode.number - 1)
    }
  }, [currentEpisode, playEpisodeByNumber])

  const handleNextEpisode = useCallback(() => {
    if (currentAnime && currentEpisode && currentEpisode.number < currentAnime.totalEpisodes) {
      playEpisodeByNumber(currentEpisode.number + 1)
    }
  }, [currentAnime, currentEpisode, playEpisodeByNumber])

  const handleRetry = useCallback(() => {
    if (currentEpisode) {
      playEpisodeByNumber(currentEpisode.number)
    }
    setPlayerError(null)
    clearError()
  }, [currentEpisode, playEpisodeByNumber, clearError])

  // Render empty state
  if (!streamUrl && !isLoadingStream) {
    return (
      <div className="relative w-full aspect-video bg-card rounded-xl overflow-hidden border border-border">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative">
            {currentEpisode?.thumbnail ? (
              <Image
                src={currentEpisode.thumbnail}
                alt="Poster"
                fill
                className="object-cover opacity-20"
              />
            ) : null}
            <div className="relative z-10 flex flex-col items-center gap-4 p-8">
              <div className="w-16 h-16 rounded-full border-2 border-muted flex items-center justify-center">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">Nenhum episódio selecionado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione um episódio abaixo ou clique em &quot;Assistir Agora&quot; em um anime
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Provider Status Bar */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Badge variant="outline" className="bg-card/80 backdrop-blur-sm border-border">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              activeProviderData?.status === "online" ? "bg-green-500" : "bg-yellow-500"
            }`} />
            {activeProviderData?.name || "GogoAnime"} • Auto
          </Badge>
          <Badge variant="outline" className="bg-card/80 backdrop-blur-sm border-border text-muted-foreground">
            Aguardando
          </Badge>
        </div>

        {/* Bottom Controls Preview */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between text-muted-foreground text-sm">
            <span>0:00</span>
            <div className="flex-1 mx-4 h-1 bg-muted/30 rounded-full" />
            <span>0:00</span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" disabled>
                <Play className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" disabled>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled>
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled>
                <Volume2 className="w-4 h-4" />
              </Button>
            </div>
            <span className="text-xs">Episódio 1 de ?</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled className="gap-1">
                <Tv className="w-4 h-4" />
                Fonte
                <ChevronDown className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" disabled>
                <Subtitles className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Player Container */}
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-border">
        {/* ArtPlayer Container */}
        <div ref={artRef} className="absolute inset-0" />

        {/* Loading Overlay */}
        {(isLoadingStream || isBuffering) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <span className="text-sm text-foreground">
                {isLoadingStream ? "Carregando stream..." : "Buffering..."}
              </span>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {(error || playerError) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex flex-col items-center gap-4 text-center p-6">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Erro ao carregar</h3>
                <p className="text-sm text-muted-foreground mt-1">{error || playerError}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleRetry} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Tentar novamente
                </Button>
                <Button variant="outline" onClick={() => { clearError(); setPlayerError(null) }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Provider & Episode Info */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <Badge variant="outline" className="bg-black/60 backdrop-blur-sm border-border">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                activeProviderData?.status === "online" ? "bg-green-500 animate-pulse" : "bg-yellow-500"
              }`} />
              {activeProviderData?.name || "GogoAnime"}
            </Badge>
            {currentSource && (
              <Badge className="bg-primary/20 text-primary border-none">
                {currentSource.quality}
              </Badge>
            )}
          </div>
          
          {currentEpisode && (
            <Badge variant="outline" className="bg-black/60 backdrop-blur-sm border-border pointer-events-auto">
              EP {currentEpisode.number} • {currentAnime?.animeTitle}
            </Badge>
          )}
        </div>
      </div>

      {/* Episode Navigation Bar */}
      <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevEpisode}
          disabled={!currentEpisode || currentEpisode.number <= 1}
          className="gap-2"
        >
          <SkipBack className="w-4 h-4" />
          Anterior
        </Button>

        <div className="flex items-center gap-4">
          {/* Source Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Tv className="w-4 h-4" />
                {currentSource?.quality || "Fonte"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuLabel>Qualidade do Stream</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableSources.map((source) => (
                <DropdownMenuItem
                  key={source.id}
                  onClick={() => switchSource(source.id)}
                  className={currentSource?.id === source.id ? "bg-primary/10 text-primary" : ""}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{source.quality}</span>
                    {currentSource?.id === source.id && (
                      <Badge className="bg-primary/20 text-primary border-none text-xs">Ativo</Badge>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
              {availableSources.length === 0 && (
                <DropdownMenuItem disabled>Nenhuma fonte disponível</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Subtitle Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={`gap-2 ${activeSubtitle ? "text-primary border-primary" : ""}`}
              >
                <Subtitles className="w-4 h-4" />
                {activeSubtitle ? "PT-BR" : "Legenda"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              <DropdownMenuLabel>Legendas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setActiveSubtitle(null)}
                className={!activeSubtitle ? "bg-primary/10 text-primary" : ""}
              >
                Desativadas
              </DropdownMenuItem>
              {subtitles.filter(s => 
                s.lang.toLowerCase().includes("portuguese") || 
                s.lang.toLowerCase().includes("pt")
              ).map((sub, i) => (
                <DropdownMenuItem
                  key={`pt-${i}`}
                  onClick={() => setActiveSubtitle(sub)}
                  className={activeSubtitle?.url === sub.url ? "bg-primary/10 text-primary" : ""}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{sub.lang}</span>
                    <Badge className="bg-green-500/20 text-green-400 border-none text-xs">PT-BR</Badge>
                  </div>
                </DropdownMenuItem>
              ))}
              {subtitles.filter(s => 
                !s.lang.toLowerCase().includes("portuguese") && 
                !s.lang.toLowerCase().includes("pt")
              ).slice(0, 5).map((sub, i) => (
                <DropdownMenuItem
                  key={`other-${i}`}
                  onClick={() => setActiveSubtitle(sub)}
                  className={activeSubtitle?.url === sub.url ? "bg-primary/10 text-primary" : ""}
                >
                  {sub.lang}
                </DropdownMenuItem>
              ))}
              {subtitles.length === 0 && (
                <DropdownMenuItem disabled>Nenhuma legenda disponível</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Episode Info */}
          <span className="text-sm text-muted-foreground">
            Episódio {currentEpisode?.number || 1} de {currentAnime?.totalEpisodes || "?"}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextEpisode}
          disabled={!currentEpisode || !currentAnime || currentEpisode.number >= currentAnime.totalEpisodes}
          className="gap-2"
        >
          Próximo
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Episode List Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowEpisodes(!showEpisodes)}
        className="w-full gap-2"
      >
        <Tv className="w-4 h-4" />
        {showEpisodes ? "Ocultar episódios" : "Ver todos os episódios"}
        <ChevronDown className={`w-4 h-4 transition-transform ${showEpisodes ? "rotate-180" : ""}`} />
      </Button>

      {/* Episode Grid */}
      {showEpisodes && currentAnime && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-4 bg-card rounded-lg border border-border max-h-64 overflow-y-auto">
          {currentAnime.episodes.map((ep) => (
            <Button
              key={ep.id}
              variant={currentEpisode?.number === ep.number ? "default" : "outline"}
              size="sm"
              onClick={() => playEpisodeByNumber(ep.number)}
              className={`h-10 ${currentEpisode?.number === ep.number ? "bg-primary" : ""}`}
            >
              {ep.number}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
