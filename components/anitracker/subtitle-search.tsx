"use client"

import { useState, useEffect } from "react"
import { Search, Download, Subtitles, Loader2, Globe, ExternalLink, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface SubtitleResult {
  url: string
  lang: string
  label: string
  provider: string
}

interface SubtitleSearchProps {
  animeTitle: string
  episodeNumber: number
  malId?: number
  onSubtitleSelect?: (subtitle: { url: string; lang: string }) => void
}

export function SubtitleSearch({ 
  animeTitle, 
  episodeNumber, 
  malId,
  onSubtitleSelect 
}: SubtitleSearchProps) {
  const [open, setOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [subtitles, setSubtitles] = useState<SubtitleResult[]>([])
  const [searched, setSearched] = useState(false)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [autoSearched, setAutoSearched] = useState(false)

  // Auto search when dialog opens
  useEffect(() => {
    if (open && !autoSearched) {
      searchSubtitles()
      setAutoSearched(true)
    }
  }, [open, autoSearched])

  // Reset auto search when anime/episode changes
  useEffect(() => {
    setAutoSearched(false)
    setSubtitles([])
    setSearched(false)
    setSelectedUrl(null)
  }, [animeTitle, episodeNumber])

  const searchSubtitles = async () => {
    setIsSearching(true)
    setSearched(true)
    
    try {
      const params = new URLSearchParams({
        title: animeTitle,
        episode: episodeNumber.toString(),
      })
      
      if (malId) {
        params.set("malId", malId.toString())
      }
      
      const response = await fetch(`/api/subtitles?${params}`)
      const data = await response.json()
      
      if (data.success && data.subtitles) {
        setSubtitles(data.subtitles)
      } else {
        setSubtitles([])
      }
    } catch (error) {
      console.error("Subtitle search error:", error)
      setSubtitles([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelect = (subtitle: SubtitleResult) => {
    setSelectedUrl(subtitle.url)
    onSubtitleSelect?.({ url: subtitle.url, lang: subtitle.lang })
  }

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "aniwatch": return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "opensubtitles": return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "subdl": return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "jimaku": return "bg-green-500/20 text-green-400 border-green-500/30"
      case "animetosho": return "bg-pink-500/20 text-pink-400 border-pink-500/30"
      default: return "bg-muted text-muted-foreground"
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "aniwatch": return "Most reliable for anime"
      case "opensubtitles": return "Largest database"
      case "subdl": return "Fast & free"
      case "jimaku": return "Anime-focused"
      case "animetosho": return "Fansub releases"
      default: return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Globe className="w-4 h-4" />
          Legendas PT-BR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Subtitles className="w-5 h-5 text-primary" />
            Legendas PT-BR
          </DialogTitle>
          <DialogDescription>
            {animeTitle} - Episodio {episodeNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Status */}
          {isSearching && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Buscando legendas em 5 fontes...</span>
            </div>
          )}

          {/* Results */}
          {searched && !isSearching && (
            <div className="space-y-3">
              {subtitles.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {subtitles.length} legenda(s) encontrada(s)
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={searchSubtitles}
                      className="text-xs"
                    >
                      <Search className="w-3 h-3 mr-1" />
                      Buscar novamente
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {subtitles.map((sub, index) => (
                        <div 
                          key={`${sub.provider}-${index}`}
                          className={cn(
                            "p-3 rounded-lg border transition-colors cursor-pointer",
                            selectedUrl === sub.url 
                              ? "border-primary bg-primary/10" 
                              : "border-border bg-background/50 hover:bg-muted/50"
                          )}
                          onClick={() => handleSelect(sub)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={getProviderColor(sub.provider)}>
                                  {sub.provider}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {getProviderIcon(sub.provider)}
                                </span>
                              </div>
                              <p className="text-sm mt-1.5 truncate text-foreground">
                                {sub.label}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {selectedUrl === sub.url ? (
                                <Badge className="bg-primary text-primary-foreground gap-1">
                                  <Check className="w-3 h-3" />
                                  Ativa
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSelect(sub)
                                  }}
                                  className="gap-1"
                                >
                                  <Subtitles className="w-4 h-4" />
                                  Usar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <a href={sub.url} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-4 h-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Nenhuma legenda PT-BR encontrada</p>
                  <p className="text-sm mt-1">
                    Tente buscar manualmente em{" "}
                    <a 
                      href={`https://www.opensubtitles.com/pt-BR/search-all/q-${encodeURIComponent(animeTitle)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      OpenSubtitles
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={searchSubtitles}
                    className="mt-4"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Tentar novamente
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Sources Info */}
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-2">Fontes de legendas:</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className={cn(getProviderColor("aniwatch"), "text-xs")}>
                AniWatch
              </Badge>
              <Badge variant="outline" className={cn(getProviderColor("jimaku"), "text-xs")}>
                Jimaku
              </Badge>
              <Badge variant="outline" className={cn(getProviderColor("opensubtitles"), "text-xs")}>
                OpenSubtitles
              </Badge>
              <Badge variant="outline" className={cn(getProviderColor("subdl"), "text-xs")}>
                SubDL
              </Badge>
              <Badge variant="outline" className={cn(getProviderColor("animetosho"), "text-xs")}>
                Animetosho
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
