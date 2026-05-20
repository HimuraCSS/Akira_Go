"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { 
  Play, 
  RefreshCw, 
  Search, 
  ChevronLeft, 
  Loader2,
  HardDrive,
  Cloud,
  Star
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSeanimeConfig } from "./seanime-settings"
import { useStreaming } from "./streaming-context"
import { cn } from "@/lib/utils"

interface SeanimeAnime {
  id: number
  title: string
  image: string
  progress: number
  totalEpisodes: number
  nextEpisode: number | null
  status: string
  score?: number
  hasLocalFiles?: boolean
}

interface SeanimeEpisode {
  id: string
  number: number
  title: string
  thumbnail: string | null
  description: string | null
  duration: string
  isDownloaded: boolean
  localFilePath: string | null
  isWatched: boolean
}

interface SeanimeAnimeDetail {
  id: number
  title: string
  image: string
  banner: string | null
  description: string | null
  status: string
  format: string
  episodes: number | null
  meanScore: number | null
  year: number | null
  progress: number
  userScore: number
  episodeList: SeanimeEpisode[]
  localFilesCount: number
}

export function SeanimeLibrary() {
  const { config, isConnected } = useSeanimeConfig()
  const { playEpisode, loadAnimeEpisodes } = useStreaming()
  
  const [continueWatching, setContinueWatching] = useState<SeanimeAnime[]>([])
  const [allEntries, setAllEntries] = useState<SeanimeAnime[]>([])
  const [selectedAnime, setSelectedAnime] = useState<SeanimeAnimeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("continue")

  const fetchLibrary = useCallback(async () => {
    if (!config?.url) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({ url: config.url })
      if (config.token) params.set("token", config.token)

      const response = await fetch(`/api/seanime/library?${params}`)
      const data = await response.json()

      if (response.ok) {
        setContinueWatching(data.continueWatching || [])
        setAllEntries(data.entries || [])
      }
    } catch (error) {
      console.error("Failed to fetch Seanime library:", error)
    } finally {
      setIsLoading(false)
    }
  }, [config])

  const fetchAnimeDetail = async (mediaId: number) => {
    if (!config?.url) return

    setIsLoadingDetail(true)
    try {
      const params = new URLSearchParams({ url: config.url })
      if (config.token) params.set("token", config.token)

      const response = await fetch(`/api/seanime/anime/${mediaId}?${params}`)
      const data = await response.json()

      if (response.ok) {
        setSelectedAnime(data)
      }
    } catch (error) {
      console.error("Failed to fetch anime detail:", error)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handlePlayEpisode = async (episode: SeanimeEpisode) => {
    if (!config?.url || !selectedAnime) return

    try {
      const params = new URLSearchParams({
        url: config.url,
        episode: episode.number.toString(),
        source: episode.isDownloaded ? "local" : "online",
      })
      if (config.token) params.set("token", config.token)

      const response = await fetch(`/api/seanime/stream/${selectedAnime.id}?${params}`)
      const data = await response.json()

      if (response.ok && data.url) {
        // Load anime into streaming context
        await loadAnimeEpisodes(
          selectedAnime.id.toString(),
          selectedAnime.title,
          selectedAnime.image,
          selectedAnime.episodeList.map(ep => ({
            id: ep.id,
            number: ep.number,
            title: ep.title,
            thumbnail: ep.thumbnail || selectedAnime.image,
            duration: ep.duration,
            animeId: selectedAnime.id.toString(),
            animeTitle: selectedAnime.title,
          }))
        )

        // Play the episode
        await playEpisode({
          id: episode.id,
          number: episode.number,
          title: episode.title,
          thumbnail: episode.thumbnail || selectedAnime.image,
          duration: episode.duration,
          animeId: selectedAnime.id.toString(),
          animeTitle: selectedAnime.title,
        })
      }
    } catch (error) {
      console.error("Failed to play episode:", error)
    }
  }

  useEffect(() => {
    if (isConnected) {
      fetchLibrary()
    }
  }, [isConnected, fetchLibrary])

  const filteredEntries = allEntries.filter(anime =>
    anime.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <HardDrive className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Seanime Not Connected</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Connect to your Seanime server in the Providers section to access your local library.
        </p>
      </div>
    )
  }

  // Detail view
  if (selectedAnime) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedAnime(null)}
            className="h-8"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>

        {/* Anime Info */}
        <div className="flex gap-4">
          <div className="w-24 h-36 relative rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={selectedAnime.image}
              alt={selectedAnime.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground line-clamp-2">{selectedAnime.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {selectedAnime.meanScore && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                  {selectedAnime.meanScore}%
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">{selectedAnime.format}</Badge>
              <Badge variant="outline" className="text-xs">{selectedAnime.status}</Badge>
              {selectedAnime.localFilesCount > 0 && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                  <HardDrive className="w-3 h-3 mr-1" />
                  {selectedAnime.localFilesCount} files
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Progress: {selectedAnime.progress} / {selectedAnime.episodes || "?"} episodes
            </p>
          </div>
        </div>

        {/* Episodes */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Episodes</h3>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
              {selectedAnime.episodeList.map((episode) => (
                <button
                  key={episode.id}
                  onClick={() => handlePlayEpisode(episode)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg border transition-all text-left",
                    episode.isWatched
                      ? "bg-secondary/30 border-border"
                      : "bg-secondary/50 border-border hover:border-primary/50"
                  )}
                >
                  <div className="w-20 h-12 relative rounded overflow-hidden flex-shrink-0 bg-secondary">
                    {episode.thumbnail ? (
                      <Image
                        src={episode.thumbnail}
                        alt={episode.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Play className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        EP {episode.number}
                      </span>
                      {episode.isDownloaded && (
                        <HardDrive className="w-3 h-3 text-green-500" />
                      )}
                      {!episode.isDownloaded && (
                        <Cloud className="w-3 h-3 text-blue-500" />
                      )}
                      {episode.isWatched && (
                        <Badge variant="secondary" className="text-xs scale-90">Watched</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {episode.title}
                    </p>
                  </div>
                  <Play className="w-4 h-4 text-primary flex-shrink-0" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    )
  }

  // Library view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Seanime Library</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={fetchLibrary}
          disabled={isLoading}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search library..."
          className="h-8 text-sm pl-8 bg-secondary/50"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="continue" className="text-xs">
            Continue ({continueWatching.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            All ({filteredEntries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="continue" className="mt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : continueWatching.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No anime in progress
            </p>
          ) : (
            <ScrollArea className="h-[280px]">
              <div className="space-y-2 pr-4">
                {continueWatching.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    onClick={() => fetchAnimeDetail(anime.id)}
                    isLoading={isLoadingDetail}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {searchQuery ? "No results found" : "Your library is empty"}
            </p>
          ) : (
            <ScrollArea className="h-[280px]">
              <div className="space-y-2 pr-4">
                {filteredEntries.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    onClick={() => fetchAnimeDetail(anime.id)}
                    isLoading={isLoadingDetail}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AnimeCard({ 
  anime, 
  onClick, 
  isLoading 
}: { 
  anime: SeanimeAnime
  onClick: () => void
  isLoading: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="w-full flex items-center gap-3 p-2 rounded-lg border bg-secondary/30 border-border hover:border-primary/50 transition-all text-left"
    >
      <div className="w-12 h-16 relative rounded overflow-hidden flex-shrink-0">
        <Image
          src={anime.image}
          alt={anime.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-foreground truncate">{anime.title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {anime.progress} / {anime.totalEpisodes || "?"} eps
          </span>
          {anime.hasLocalFiles && (
            <HardDrive className="w-3 h-3 text-green-500" />
          )}
        </div>
        {anime.nextEpisode && (
          <p className="text-xs text-primary mt-0.5">
            Next: EP {anime.nextEpisode}
          </p>
        )}
      </div>
      <Play className="w-4 h-4 text-primary flex-shrink-0" />
    </button>
  )
}
