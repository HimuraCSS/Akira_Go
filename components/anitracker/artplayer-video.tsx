"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Artplayer from "artplayer"
import Hls from "hls.js"
import { 
  ChevronDown, 
  Loader2, 
  AlertCircle,
  List,
  Subtitles,
  Volume2,
  Settings,
  Maximize,
  SkipForward,
  SkipBack,
  RefreshCcw,
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
import { useStreaming } from "./streaming-context"
import { cn } from "@/lib/utils"

export function VideoPlayer() {
  const artRef = useRef<HTMLDivElement>(null)
  const artInstance = useRef<Artplayer | null>(null)
  const hlsInstance = useRef<Hls | null>(null)
  
  const [showEpisodes, setShowEpisodes] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  
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
    playEpisodeByNumber,
    activeProvider,
    providers,
    clearError,
  } = useStreaming()

  const activeProviderData = providers.find(p => p.id === activeProvider)

  // Initialize ArtPlayer
  const initPlayer = useCallback((url: string, isHls: boolean) => {
    if (!artRef.current) return
    
    // Cleanup previous instance
    if (artInstance.current) {
      artInstance.current.destroy()
      artInstance.current = null
    }
    if (hlsInstance.current) {
      hlsInstance.current.destroy()
      hlsInstance.current = null
    }
    
    setIsInitializing(true)
    setPlayerError(null)
    
    try {
      const art = new Artplayer({
        container: artRef.current,
        url: url,
        volume: 0.7,
        isLive: false,
        muted: false,
        autoplay: true,
        pip: true,
        autoSize: false,
        autoMini: false,
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
            color: "#fff",
            fontSize: "20px",
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
          },
        } : undefined,
        settings: [
          {
            width: 200,
            html: "Qualidade",
            tooltip: currentSource?.quality || "Auto",
            selector: availableSources.map((source, index) => ({
              default: source.id === currentSource?.id,
              html: source.quality,
              value: index,
            })),
            onSelect: function(item) {
              const source = availableSources[item.value as number]
              if (source) {
                switchSource(source.id)
              }
              return item.html
            },
          },
        ],
        customType: {
          m3u8: function(video: HTMLVideoElement, url: string) {
            if (Hls.isSupported()) {
              const hls = new Hls({
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                enableWorker: true,
                lowLatencyMode: false,
              })
              hls.loadSource(url)
              hls.attachMedia(video)
              hlsInstance.current = hls
              
              hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                  switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      setPlayerError("Erro de rede. Tentando reconectar...")
                      hls.startLoad()
                      break
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      setPlayerError("Erro de mídia. Recuperando...")
                      hls.recoverMediaError()
                      break
                    default:
                      setPlayerError("Erro fatal no player")
                      break
                  }
                }
              })
              
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setPlayerError(null)
                setIsInitializing(false)
              })
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
              video.src = url
              setIsInitializing(false)
            } else {
              setPlayerError("HLS não suportado neste navegador")
            }
          },
        },
      })
      
      // Event listeners
      art.on("ready", () => {
        setIsInitializing(false)
        setIsPlaying(true)
      })
      
      art.on("play", () => setIsPlaying(true))
      art.on("pause", () => setIsPlaying(false))
      art.on("waiting", () => setIsBuffering(true))
      art.on("playing", () => setIsBuffering(false))
      
      art.on("error", () => {
        setPlayerError("Erro ao carregar o vídeo")
      })
      
      artInstance.current = art
    } catch (err) {
      console.error("[v0] ArtPlayer init error:", err)
      setPlayerError("Falha ao inicializar o player")
      setIsInitializing(false)
    }
  }, [activeSubtitle, availableSources, currentSource, setIsBuffering, setIsPlaying, switchSource])

  // Initialize player when stream URL changes
  useEffect(() => {
    if (streamUrl && artRef.current) {
      const isHls = streamUrl.includes(".m3u8") || currentSource?.isM3U8
      initPlayer(streamUrl, isHls || false)
    }
    
    return () => {
      if (artInstance.current) {
        artInstance.current.destroy()
        artInstance.current = null
      }
      if (hlsInstance.current) {
        hlsInstance.current.destroy()
        hlsInstance.current = null
      }
    }
  }, [streamUrl, initPlayer, currentSource?.isM3U8])

  // Update subtitle
  useEffect(() => {
    if (artInstance.current && activeSubtitle) {
      artInstance.current.subtitle.switch(activeSubtitle.url, {
        name: activeSubtitle.lang,
      })
    }
  }, [activeSubtitle])

  const handleRetry = () => {
    if (streamUrl) {
      const isHls = streamUrl.includes(".m3u8") || currentSource?.isM3U8
      initPlayer(streamUrl, isHls || false)
    }
    clearError()
  }

  const handlePrevEpisode = () => {
    if (currentEpisode && currentEpisode.number > 1) {
      playEpisodeByNumber(currentEpisode.number - 1)
    }
  }

  const handleNextEpisode = () => {
    if (currentAnime && currentEpisode && currentEpisode.number < currentAnime.totalEpisodes) {
      playEpisodeByNumber(currentEpisode.number + 1)
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Player Status Bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isLoadingStream ? "bg-yellow-500 animate-pulse" :
              streamUrl ? "bg-green-500" : "bg-muted"
            )} />
            <span className="text-sm text-muted-foreground">
              {activeProviderData?.name || "Nenhum"} • {currentSource?.quality || "Auto"}
            </span>
          </div>
          <Badge variant="outline" className="text-xs border-border">
            {isLoadingStream ? "Carregando..." : 
             isBuffering ? "Buffering..." : 
             streamUrl ? "Pronto" : "Aguardando"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Source Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Fonte</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
              <DropdownMenuLabel>Qualidade do Vídeo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableSources.length > 0 ? (
                availableSources.map((source) => (
                  <DropdownMenuItem
                    key={source.id}
                    onClick={() => switchSource(source.id)}
                    className={cn(
                      "cursor-pointer",
                      currentSource?.id === source.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{source.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {source.quality}
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  Nenhuma fonte disponível
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Subtitle Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "text-muted-foreground hover:text-foreground gap-2",
                  activeSubtitle && "text-primary"
                )}
              >
                <Subtitles className="w-4 h-4" />
                <span className="hidden sm:inline">Legenda</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
              <DropdownMenuLabel>Legendas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setActiveSubtitle(null)}
                className={cn("cursor-pointer", !activeSubtitle && "bg-primary/10 text-primary")}
              >
                Desativadas
              </DropdownMenuItem>
              {subtitles.map((sub, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => setActiveSubtitle(sub)}
                  className={cn(
                    "cursor-pointer",
                    activeSubtitle?.url === sub.url && "bg-primary/10 text-primary"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{sub.lang}</span>
                    {(sub.lang.toLowerCase().includes("portuguese") || 
                      sub.lang.toLowerCase().includes("pt")) && (
                      <Badge className="bg-green-500/20 text-green-400 text-xs border-none">
                        PT-BR
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
              {subtitles.length === 0 && (
                <DropdownMenuItem disabled className="text-xs">
                  Nenhuma legenda disponível
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Episode List Toggle */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowEpisodes(!showEpisodes)}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              showEpisodes && "text-primary"
            )}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Player Container */}
      <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-border">
        {/* ArtPlayer Container */}
        <div 
          ref={artRef} 
          className="absolute inset-0 w-full h-full"
          style={{ aspectRatio: "16/9" }}
        />

        {/* Loading Overlay */}
        {(isLoadingStream || isInitializing || isBuffering) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">
                {isLoadingStream ? "Buscando fontes..." : 
                 isInitializing ? "Iniciando player..." : "Buffering..."}
              </span>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {(error || playerError) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="flex flex-col items-center gap-4 p-6 text-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <div className="space-y-1">
                <p className="text-foreground font-medium">Erro ao reproduzir</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {error || playerError}
                </p>
              </div>
              <Button onClick={handleRetry} variant="outline" className="gap-2">
                <RefreshCcw className="w-4 h-4" />
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}

        {/* No Episode Selected */}
        {!currentEpisode && !isLoadingStream && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/90 to-transparent">
            <div className="flex flex-col items-center gap-4 text-center p-6">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <Volume2 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="text-foreground font-medium">Nenhum episódio selecionado</p>
                <p className="text-sm text-muted-foreground">
                  Selecione um episódio abaixo ou clique em &quot;Assistir Agora&quot; em um anime
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Episode Navigation */}
      {currentEpisode && currentAnime && (
        <div className="flex items-center justify-between px-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevEpisode}
            disabled={currentEpisode.number <= 1}
            className="gap-2"
          >
            <SkipBack className="w-4 h-4" />
            Anterior
          </Button>
          
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {currentAnime.animeTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              Episódio {currentEpisode.number} de {currentAnime.totalEpisodes}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextEpisode}
            disabled={currentEpisode.number >= currentAnime.totalEpisodes}
            className="gap-2"
          >
            Próximo
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Episode Grid */}
      {showEpisodes && currentAnime && currentAnime.episodes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground px-2">
            Episódios ({currentAnime.episodes.length})
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-48 overflow-y-auto p-2">
            {currentAnime.episodes.map((ep) => (
              <button
                key={ep.id}
                onClick={() => playEpisodeByNumber(ep.number)}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all",
                  "border hover:border-primary hover:bg-primary/10",
                  currentEpisode?.number === ep.number
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 text-foreground border-border"
                )}
              >
                {ep.number}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
