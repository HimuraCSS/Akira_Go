"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Filter, Grid, List, Star, Play, Plus, Check, Clock, Pause, X as XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMALAuth } from "@/components/anitracker/mal-auth-context"

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

export default function MyListPage() {
  const { user, isAuthenticated, isLoading, animeList, isLoadingList, fetchAnimeList, login } = useMALAuth()
  const [activeStatus, setActiveStatus] = useState<ListStatus>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnimeList(activeStatus === "all" ? undefined : activeStatus)
    }
  }, [isAuthenticated, activeStatus, fetchAnimeList])

  const filteredList = activeStatus === "all" 
    ? animeList 
    : animeList.filter(item => item.list_status.status === activeStatus)

  if (isLoading) {
    return <LoadingState />
  }

  if (!isAuthenticated) {
    return <LoginPrompt onLogin={login} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border">
        <div className="container mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">Minha Lista</h1>
                <p className="text-sm text-muted-foreground">
                  {user?.anime_statistics?.num_items_watching || 0} assistindo • {user?.anime_statistics?.num_items_completed || 0} completos
                </p>
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
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mx-auto px-6 lg:px-8 py-6">
        <Tabs value={activeStatus} onValueChange={(v) => setActiveStatus(v as ListStatus)}>
          <TabsList className="w-full justify-start overflow-x-auto bg-secondary/50 p-1">
            {Object.entries(STATUS_LABELS).map(([key, label]) => {
              const Icon = STATUS_ICONS[key]
              return (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {label}
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
                  <AnimeListCard key={item.node.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredList.map((item) => (
                  <AnimeListRow key={item.node.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

interface AnimeListItem {
  node: {
    id: number
    title: string
    main_picture?: { medium: string; large: string }
    num_episodes?: number
    mean?: number
  }
  list_status: {
    status: string
    score: number
    num_episodes_watched: number
  }
}

function AnimeListCard({ item }: { item: AnimeListItem }) {
  const progress = item.node.num_episodes 
    ? Math.round((item.list_status.num_episodes_watched / item.node.num_episodes) * 100)
    : 0

  return (
    <div className="group relative glass-card rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all">
      <div className="aspect-[2/3] relative">
        <Image
          src={item.node.main_picture?.large || item.node.main_picture?.medium || "/placeholder.jpg"}
          alt={item.node.title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        {/* Progress bar */}
        {item.list_status.status === "watching" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Score badge */}
        {item.list_status.score > 0 && (
          <Badge className="absolute top-2 right-2 bg-background/80 text-foreground">
            <Star className="w-3 h-3 mr-1 text-yellow-400 fill-yellow-400" />
            {item.list_status.score}
          </Badge>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button size="sm" className="bg-primary text-primary-foreground">
            <Play className="w-4 h-4 mr-1" />
            Continuar
          </Button>
        </div>
      </div>

      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground line-clamp-2">{item.node.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          EP {item.list_status.num_episodes_watched}/{item.node.num_episodes || "?"}
        </p>
      </div>
    </div>
  )
}

function AnimeListRow({ item }: { item: AnimeListItem }) {
  const progress = item.node.num_episodes 
    ? Math.round((item.list_status.num_episodes_watched / item.node.num_episodes) * 100)
    : 0

  return (
    <div className="glass-card rounded-lg border border-border p-3 flex items-center gap-4 hover:border-primary/50 transition-all">
      <div className="w-12 h-16 relative rounded overflow-hidden flex-shrink-0">
        <Image
          src={item.node.main_picture?.medium || "/placeholder.jpg"}
          alt={item.node.title}
          fill
          className="object-cover"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-foreground truncate">{item.node.title}</h3>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-muted-foreground">
            EP {item.list_status.num_episodes_watched}/{item.node.num_episodes || "?"}
          </span>
          {item.list_status.score > 0 && (
            <span className="text-xs text-muted-foreground flex items-center">
              <Star className="w-3 h-3 mr-1 text-yellow-400 fill-yellow-400" />
              {item.list_status.score}
            </span>
          )}
          {item.node.mean && (
            <span className="text-xs text-muted-foreground">
              MAL: {item.node.mean.toFixed(1)}
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Button size="sm" variant="ghost">
        <Play className="w-4 h-4" />
      </Button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="mt-4 text-muted-foreground">Carregando...</p>
      </div>
    </div>
  )
}

function LoginPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-card border-b border-border">
        <div className="container mx-auto px-6 lg:px-8 py-4">
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

      <div className="container mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Plus className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Conecte sua conta</h2>
          <p className="text-muted-foreground mb-6">
            Faça login com sua conta do MyAnimeList para sincronizar sua lista de animes e acompanhar seu progresso.
          </p>
          <Button onClick={onLogin} size="lg" className="bg-primary text-primary-foreground">
            Entrar com MyAnimeList
          </Button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ status }: { status: string }) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
        <Filter className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">Nenhum anime encontrado</h3>
      <p className="text-muted-foreground">
        Você ainda não tem animes na categoria &ldquo;{STATUS_LABELS[status]}&rdquo;.
      </p>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="glass-card rounded-lg overflow-hidden animate-pulse">
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
