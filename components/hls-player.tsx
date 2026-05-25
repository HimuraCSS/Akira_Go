"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Loader2,
  SkipForward,
  SkipBack,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface HLSPlayerProps {
  src: string
  autoplay?: boolean
  className?: string
  onEnded?: () => void
  onError?: (error: string) => void
}

export function HLSPlayer({ 
  src, 
  autoplay = true, 
  className,
  onEnded,
  onError 
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(80)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null)

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    setError(null)
    setIsBuffering(true)

    // Proxy M3U8 through our API to avoid CORS
    const proxiedUrl = `/api/proxy/m3u8?url=${encodeURIComponent(src)}`

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      })

      hls.loadSource(proxiedUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false)
        if (autoplay) {
          video.play().catch(() => {
            setIsPlaying(false)
          })
        }
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError("Erro de rede - tentando reconectar...")
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError("Erro de mídia - recuperando...")
              hls.recoverMediaError()
              break
            default:
              setError("Erro fatal no stream")
              onError?.("Fatal HLS error")
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
      video.src = proxiedUrl
      video.addEventListener("loadedmetadata", () => {
        setIsBuffering(false)
        if (autoplay) {
          video.play().catch(() => setIsPlaying(false))
        }
      })
    } else {
      setError("HLS não suportado neste navegador")
      onError?.("HLS not supported")
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src, autoplay, onError])

  // Video event handlers
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
    const handleEnded = () => onEnded?.()

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("playing", handlePlaying)
    video.addEventListener("ended", handleEnded)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("playing", handlePlaying)
      video.removeEventListener("ended", handleEnded)
    }
  }, [onEnded])

  // Update volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100
    }
  }, [volume, isMuted])

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Auto-hide controls
  const resetHideTimer = () => {
    setShowControls(true)
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current)
    }
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
    resetHideTimer()
  }

  const handleSeek = (value: number[]) => {
    if (videoRef.current && duration) {
      videoRef.current.currentTime = (value[0] / 100) * duration
      setProgress(value[0])
    }
  }

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(
        videoRef.current.currentTime + seconds,
        duration
      ))
    }
  }

  const toggleFullscreen = () => {
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

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative bg-black group",
        className
      )}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        crossOrigin="anonymous"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Buffering Overlay */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="text-center text-white">
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* Center Play Button */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <Slider
          value={[progress]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="mb-3 cursor-pointer"
        />

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-primary hover:bg-white/10"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-primary hover:bg-white/10"
              onClick={() => skip(-10)}
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-primary hover:bg-white/10"
              onClick={() => skip(10)}
            >
              <SkipForward className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-primary hover:bg-white/10"
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
                className="w-20"
              />
            </div>

            <span className="text-sm text-white/80 ml-4">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-primary hover:bg-white/10"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
