"use client"

import { useState } from "react"
import { Search, Download, Subtitles, Loader2, Globe, ExternalLink } from "lucide-react"
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

interface SubtitleResult {
  id: string
  url: string
  lang: string
  langCode: string
  format: string
  source: string
  release?: string
  downloads?: number
}

interface SubtitleSearchProps {
  animeTitle: string
  episodeNumber: number
  malId?: number
  onSubtitleSelect?: (subtitle: SubtitleResult) => void
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

  const searchSubtitles = async () => {
    setIsSearching(true)
    setSearched(true)
    
    try {
      const params = new URLSearchParams({
        title: animeTitle,
        episode: episodeNumber.toString(),
        lang: "pt-BR",
      })
      
      if (malId) {
        params.set("malId", malId.toString())
      }
      
      const response = await fetch(`/api/subtitles/search?${params}`)
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
    onSubtitleSelect?.(subtitle)
    setOpen(false)
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case "opensubtitles": return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "subdl": return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "subf2m": return "bg-green-500/20 text-green-400 border-green-500/30"
      default: return "bg-muted text-muted-foreground"
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
            Buscar Legendas PT-BR
          </DialogTitle>
          <DialogDescription>
            Busque legendas em portugues para {animeTitle} - Episodio {episodeNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Button */}
          <Button 
            onClick={searchSubtitles} 
            disabled={isSearching}
            className="w-full gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando legendas...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Buscar Legendas
              </>
            )}
          </Button>

          {/* Results */}
          {searched && (
            <div className="space-y-3">
              {subtitles.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {subtitles.length} legenda(s) encontrada(s)
                  </p>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {subtitles.map((sub) => (
                        <div 
                          key={sub.id}
                          className="p-3 rounded-lg border border-border bg-background/50 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className={getSourceColor(sub.source)}>
                                  {sub.source}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {sub.format.toUpperCase()}
                                </Badge>
                                {sub.downloads && (
                                  <span className="text-xs text-muted-foreground">
                                    {sub.downloads.toLocaleString()} downloads
                                  </span>
                                )}
                              </div>
                              {sub.release && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {sub.release}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSelect(sub)}
                                className="gap-1"
                              >
                                <Subtitles className="w-4 h-4" />
                                Usar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
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
              ) : !isSearching && (
                <div className="text-center py-8 text-muted-foreground">
                  <Subtitles className="w-12 h-12 mx-auto mb-3 opacity-50" />
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
                </div>
              )}
            </div>
          )}

          {/* Info */}
          {!searched && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <p>Buscamos legendas em portugues de multiplas fontes:</p>
              <div className="flex justify-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={getSourceColor("opensubtitles")}>OpenSubtitles</Badge>
                <Badge variant="outline" className={getSourceColor("subdl")}>SubDL</Badge>
                <Badge variant="outline" className={getSourceColor("subf2m")}>Subf2m</Badge>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
