"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Grid, List, Star, Play, Search, User, Calendar, Clock, Check, Pause, X as XIcon, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

type ListStatus = "all" | "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch"

const STATUS_LABELS: Record<string, string> = {
  all: "Todos",
  watching: "Assistindo",
  completed: "Completos",
  on_hold: "Pausados",
  dropped: "Abandonados",
  plan_to_watch: "Planejo Assistir",
}

const STATUS_ICONS: Record<string, typeof Play> = {
  watching: Play,
  completed: Check,
  on_hold: Pause,
  dropped: XIcon,
  plan_to_watch: Clock,
}

const STATUS_MAP: Record<number, string> = {
  1: "watching",
  2: "completed",
  3: "on_hold",
  4: "dropped",
  6: "plan_to_watch",
}

interface MALAnime {
  malId: number
  title: string
  titleEnglish?: string
  image: string
  score: number
  status: number | string
  progress: number
  totalEpisodes: number
  type?: string
  year?: number
  airing?: boolean
}

interface MALProfile {
  username: string
  avatar: string
}

export default function MyListPage() {
  const [malUsername, setMalUsername] = useState<string | null>(null)
  const [profile, setProfile] = useState<MALProfile | null>(null)
  const [animeList, setAnimeList] = useState<MALAnime[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState<ListStatus>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showUsernameDialog, setShowUsernameDialog] = useState(false)
  const [usernameInput, setUsernameInput] = useState("")

  // Load username from localStorage on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem("mal_username")
    if (savedUsername) {
      setMalUsername(savedUsername)
    }
    setIsLoading(false)
  }, [])

  // Fetch user list when username changes
  const fetchUserList = useCallback(async (username: string) => {
    setIsLoadingList(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/mal/user?username=${encodeURIComponent(username)}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar lista")
      }
      
      setProfile(data.profile)
      setAnimeList(data.items || [])
      localStorage.setItem("mal_username", username)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      setAnimeList([])
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (malUsername) {
      fetchUserList(malUsername)
    }
  }, [malUsername, fetchUserList])

  const handleConnect = () => {
    if (usernameInput.trim()) {
      setMalUsername(usernameInput.trim())
      setShowUsernameDialog(false)
      setUsernameInput("")
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem("mal_username")
    setMalUsername(null)
    setProfile(null)
    setAnimeList([])
  }

  const getStatusString = (status: number | string): string => {
    if (typeof status === "string") return status
    return STATUS_MAP[status] || "watching"
  }

  const filteredList = activeStatus === "all" 
    ? animeList 
    : animeList.filter(item => getStatusString(item.status) === activeStatus)

  const statusCounts = {
    all: animeList.length,
    watching: animeList.filter(i => getStatusString(i.status) === "watching").length,
    completed: animeList.filter(i => getStatusString(i.status) === "completed").length,
    on_hold: animeList.filter(i => getStatusString(i.status) === "on_hold").length,
    dropped: animeList.filter(i => getStatusString(i.status) === "dropped").length,
    plan_to_watch: animeList.filter(i => getStatusString(i.status) === "plan_to_watch").length,
  }

  if (isLoading) {
    return <LoadingState />
  }

  if (!malUsername) {
    return (
      <>
        <LoginPrompt onConnect={() => setShowUsernameDialog(true)} />
        <UsernameDialog 
          open={showUsernameDialog} 
          onOpenChange={setShowUsernameDialog}
          value={usernameInput}
          onChange={setUsernameInput}
          onSubmit={handleConnect}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                {profile?.avatar && (
                  <Image
                    src={profile.avatar}
                    alt={profile.username}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                )}
                <div>
                  <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                    {profile?.username || malUsername}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => fetchUserList(malUsername)}>
                      <RefreshCw className={`w-3 h-3 ${isLoadingList ? "animate-spin" : ""}`} />
                    </Button>
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {statusCounts.watching} assistindo • {statusCounts.completed} completos
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                Desconectar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => fetchUserList(malUsername)}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="container mx-auto px-4 lg:px-8 py-6">
        <Tabs value={activeStatus} onValueChange={(v) => setActiveStatus(v as ListStatus)}>
          <TabsList className="w-full justify-start overflow-x-auto bg-secondary/50 p-1 flex-wrap h-auto">
            {Object.entries(STATUS_LABELS).map(([key, label]) => {
              const Icon = STATUS_ICONS[key]
              const count = statusCounts[key as ListStatus]
              return (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {label}
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {count}
                  </Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value={activeStatus} className="mt-6">
            {isLoadingList ? (
              <GridSkeleton />
            ) : filteredList.length === 0 ? (
              <EmptyState status={activeStatus} />
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredList.map((item) => (
                  <AnimeListCard key={item.malId} item={item} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredList.map((item) => (
                  <AnimeListRow key={item.malId} item={item} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function AnimeListCard({ item }: { item: MALAnime }) {
  const progress = item.totalEpisodes 
    ? Math.round((item.progress / item.totalEpisodes) * 100)
    : 0

  return (
    <Link href={`/anime/${item.malId}`}>
      <div className="group relative bg-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all">
        <div className="aspect-[2/3] relative">
          <Image
            src={item.image || "/placeholder.jpg"}
            alt={item.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          {/* Progress bar */}
          {item.progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}

          {/* Score badge */}
          {item.score > 0 && (
            <Badge className="absolute top-2 right-2 bg-background/80 text-foreground">
              <Star className="w-3 h-3 mr-1 text-yellow-400 fill-yellow-400" />
              {item.score}
            </Badge>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button size="sm" className="bg-primary text-primary-foreground">
              <Play className="w-4 h-4 mr-1" />
              Assistir
            </Button>
          </div>
        </div>

        <div className="p-3">
          <h3 className="text-sm font-medium text-foreground line-clamp-2">{item.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            EP {item.progress}/{item.totalEpisodes || "?"}
          </p>
        </div>
      </div>
    </Link>
  )
}

function AnimeListRow({ item }: { item: MALAnime }) {
  const progress = item.totalEpisodes 
    ? Math.round((item.progress / item.totalEpisodes) * 100)
    : 0

  return (
    <Link href={`/anime/${item.malId}`}>
      <div className="bg-card rounded-lg border border-border p-3 flex items-center gap-4 hover:border-primary/50 transition-all">
        <div className="w-12 h-16 relative rounded overflow-hidden flex-shrink-0">
          <Image
            src={item.image || "/placeholder.jpg"}
            alt={item.title}
            fill
            className="object-cover"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate">{item.title}</h3>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-muted-foreground">
              EP {item.progress}/{item.totalEpisodes || "?"}
            </span>
            {item.score > 0 && (
              <span className="text-xs text-muted-foreground flex items-center">
                <Star className="w-3 h-3 mr-1 text-yellow-400 fill-yellow-400" />
                {item.score}
              </span>
            )}
            {item.year && (
              <span className="text-xs text-muted-foreground flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {item.year}
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Button size="sm" variant="ghost">
          <Play className="w-4 h-4" />
        </Button>
      </div>
    </Link>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  )
}

function LoginPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Minha Lista</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-20">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Sincronize com MyAnimeList</h2>
          <p className="text-muted-foreground mb-6">
            Digite seu nome de usuario do MyAnimeList para importar sua lista de animes e acompanhar seu progresso.
          </p>
          <Button onClick={onConnect} size="lg" className="bg-primary text-primary-foreground">
            <Search className="w-4 h-4 mr-2" />
            Conectar com MAL
          </Button>
        </div>
      </div>
    </div>
  )
}

function UsernameDialog({ 
  open, 
  onOpenChange, 
  value, 
  onChange, 
  onSubmit 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar com MyAnimeList</DialogTitle>
          <DialogDescription>
            Digite seu nome de usuario do MyAnimeList. Sua lista precisa ser publica para funcionar.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Seu username do MAL"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Exemplo: se sua URL e myanimelist.net/profile/Nesjc, seu username e &quot;Nesjc&quot;
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={!value.trim()}>
            Conectar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EmptyState({ status }: { status: string }) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
        <List className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">Nenhum anime encontrado</h3>
      <p className="text-muted-foreground">
        Voce ainda nao tem animes na categoria &quot;{STATUS_LABELS[status]}&quot;.
      </p>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="bg-card rounded-lg overflow-hidden animate-pulse border border-border">
          <div className="aspect-[2/3] bg-secondary/50" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-secondary/50 rounded w-3/4" />
            <div className="h-3 bg-secondary/50 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
