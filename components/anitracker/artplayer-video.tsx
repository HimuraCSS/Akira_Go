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
  SkipForward,
  SkipBack,
  RefreshCcw,
  ExternalLink,
  Monitor,
  Info,
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

import { SubtitleSearch } from "./subtitle-search"
import { 
  artplayerAutoSkip, 
  artplayerChapterHighlight, 
  artplayerUploadSubtitle,
  saveContinueWatching,
  getContinueWatchingEntry,
} from "./artplayer-plugins"

export function VideoPlayer() {
  const artRef = useRef<HTMLDivElement>(null)
  const artInstance = useRef<Artplayer | null>(null)
  const hlsInstance = useRef<Hls | null>(null)
  
  const [showEpisodes, setShowEpisodes] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [demoMessage, setDemoMessage] = useState<string | null>(null)
  const [isIframeSource, setIsIframeSource] = useState(false)
  
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
    intro,
    outro,
  } = useStreaming()

  const activeProviderData = providers.find(p => p.id === activeProvider)

  // Check if current source is demo or iframe
  useEffect(() => {
    if (currentSource) {
      const isDemoSource = currentSource.url?.includes("test-streams.mux.dev") || 
                          currentSource.url?.includes("bitdash-a.akamaihd.net") ||
                          currentSource.url?.includes("plyr.io")
      const isIframe = currentSource.type === "iframe" || 
                       currentSource.url?.includes("megaplay.buzz") ||
                       currentSource.url?.includes("/embed/") ||
                       currentSource.url?.includes("/stream/mal/")
      
      setIsDemo(isDemoSource)
      setIsIframeSource(isIframe && !isDemoSource)
      
      if (isDemoSource) {
        setDemoMessage("Vídeo de demonstração - fontes reais indisponíveis")
      } else {
        setDemoMessage(null)
      }
    }
  }, [currentSource])

  // Generate VLC link for external playback
  const getVLCLink = useCallback(() => {
    if (!streamUrl) return null
    return `vlc://${streamUrl}`
  }, [streamUrl])

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
        ...(activeSubtitle && activeSubtitle.url ? {
          subtitle: {
            url: activeSubtitle.url,
            type: "vtt",
            encoding: "utf-8",
            style: {
              color: "#fff",
              fontSize: "20px",
              textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
            },
          },
        } : {}),
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
        plugins: [
          // Auto-skip intro/outro plugin
          ...(intro || outro ? [artplayerAutoSkip({ intro, outro, autoSkipIntro: false, autoSkipOutro: false })] : []),
          // Chapter highlight on progress bar
          ...(intro || outro ? [artplayerChapterHighlight({ intro, outro })] : []),
          // Upload subtitle plugin
          artplayerUploadSubtitle(),
        ],
      })
      
      // Event listeners
      art.on("ready", () => {
        setIsInitializing(false)
        setIsPlaying(true)
        
        // Resume from continue watching position
        if (currentAnime && currentEpisode) {
          const entry = getContinueWatchingEntry(currentAnime.animeId.toString())
          if (entry && entry.episodeNumber === currentEpisode.number && entry.leftAt > 10) {
            art.currentTime = entry.leftAt
            art.notice.show = `Continuando de ${Math.floor(entry.leftAt / 60)}:${String(Math.floor(entry.leftAt % 60)).padStart(2, "0")}`
          }
        }
      })
      
      art.on("play", () => setIsPlaying(true))
      art.on("pause", () => setIsPlaying(false))
      art.on("waiting", () => setIsBuffering(true))
      art.on("playing", () => setIsBuffering(false))
      
      art.on("error", () => {
        setPlayerError("Erro ao carregar o vídeo")
      })
      
      // Save continue watching on destroy
      art.on("destroy", () => {
        if (currentAnime && currentEpisode && art.currentTime > 30) {
          saveContinueWatching({
            animeId: currentAnime.animeId.toString(),
            animeTitle: currentAnime.animeTitle,
            episodeNumber: currentEpisode.number,
            episodeId: currentEpisode.id,
            poster: currentAnime.poster,
            leftAt: art.currentTime,
            duration: art.duration,
            updatedAt: Date.now(),
          })
        }
      })
      
      artInstance.current = art
    } catch (err) {
      console.error("[v0] ArtPlayer init error:", err)
      setPlayerError("Falha ao inicializar o player")
      setIsInitializing(false)
    }
  }, [activeSubtitle, availableSources, currentSource, setIsBuffering, setIsPlaying, switchSource, intro, outro, currentAnime, currentEpisode])

  // Initialize player when stream URL changes - skip for iframe sources
  useEffect(() => {
    // Don't initialize ArtPlayer for iframe sources
    const isIframe = currentSource?.type === "iframe" || 
                     streamUrl?.includes("megaplay.buzz") ||
                     streamUrl?.includes("/embed/") ||
                     streamUrl?.includes("/stream/mal/")
    
    if (streamUrl && artRef.current && !isIframe) {
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
  }, [streamUrl, initPlayer, currentSource])

  // Update subtitle
  useEffect(() => {
    if (artInstance.current && activeSubtitle && artInstance.current.subtitle) {
      try {
        artInstance.current.subtitle.switch(activeSubtitle.url, {
          name: activeSubtitle.lang,
        })
      } catch (e) {
        console.log("[v0] Subtitle switch error:", e)
      }
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

  // Don't render anything if no anime is selected
  if (!currentAnime && !isLoadingStream) {
    return null
  }

  return (
    <section className="py-6" data-player-section>
      <div className="container mx-auto px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-3">
      {/* Player Status Bar - Compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isLoadingStream ? "bg-yellow-500 animate-pulse" :
            streamUrl ? "bg-green-500" : "bg-muted"
          )} />
          <span className="text-xs text-muted-foreground">
            {activeProviderData?.name || "Nenhum"} • {currentSource?.quality || "Auto"}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* PT-BR Subtitle Search */}
          {currentAnime && currentEpisode && (
            <SubtitleSearch
              animeTitle={currentAnime.animeTitle}
              episodeNumber={currentEpisode.number}
              onSubtitleSelect={(sub) => {
                // Set the selected subtitle
                setActiveSubtitle({ url: sub.url, lang: sub.lang })
              }}
            />
          )}

          {/* VLC Button & Demo Badge */}
          {isDemo && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 bg-yellow-500/10 text-xs">
              Demo
            </Badge>
          )}
          
          {streamUrl && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Abrir em</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                <DropdownMenuLabel>Player Externo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={getVLCLink() || "#"} className="cursor-pointer flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Abrir no VLC
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigator.clipboard.writeText(streamUrl)}
                  className="cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Copiar URL do Stream
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
        {/* Iframe Player - when source is iframe type */}
        {isIframeSource && streamUrl && !isLoadingStream && (
          <div className="absolute inset-0 w-full h-full bg-black">
            <iframe
              key={streamUrl}
              src={streamUrl}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              style={{ border: "none" }}
            />
          </div>
        )}

        {/* ArtPlayer Container - when source is not iframe */}
        {!isIframeSource && (
          <div 
            ref={artRef} 
            className="absolute inset-0 w-full h-full"
            style={{ aspectRatio: "16/9" }}
          />
        )}

        {/* Demo Notice Banner */}
        {isDemo && streamUrl && !isLoadingStream && (
          <div className="absolute top-4 left-4 right-4 z-30">
            <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-lg px-4 py-2 flex items-center gap-3">
              <Info className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-yellow-200 font-medium">Modo Demonstração</p>
                <p className="text-xs text-yellow-200/70">{demoMessage}</p>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/20"
                onClick={() => setIsDemo(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}

        {/* Loading Overlay - only show when not iframe */}
        {(isLoadingStream || isInitializing || isBuffering) && !isIframeSource && (
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

        {/* Error Overlay - show for any error, but not when iframe is playing */}
        {(error || playerError) && !(isIframeSource && streamUrl) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
            <div className="flex flex-col items-center gap-4 p-6 text-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <div className="space-y-2">
                <p className="text-foreground font-medium text-lg">Erro ao reproduzir</p>
                <p className="text-sm text-muted-foreground max-w-sm">
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
      </div>
    </section>
  )
}
