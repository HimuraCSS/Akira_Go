"use client"

import { Link2, CheckCircle, XCircle, ChevronDown, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useMALAuth } from "./mal-auth-context"

export function TrackingCard() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [malUsername, setMalUsername] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  
  const { user: malUser, isConnected: malConnected, connect, disconnect, error, clearError } = useMALAuth()

  const handleMALConnect = async () => {
    if (!malUsername.trim()) return
    setIsConnecting(true)
    clearError()
    await connect(malUsername.trim())
    setIsConnecting(false)
    setMalUsername("")
  }

  const services = [
    { 
      id: "mal", 
      name: "MyAnimeList", 
      icon: "MAL",
      connected: malConnected,
      username: malUser?.username,
      syncedItems: malUser?.statistics?.total_entries
    },
    { 
      id: "anilist", 
      name: "AniList", 
      icon: "AL",
      connected: false,
    },
    { 
      id: "kitsu", 
      name: "Kitsu", 
      icon: "K",
      connected: false,
    },
  ]

  const connectedCount = services.filter(s => s.connected).length

  return (
    <Card className="glass-card glass-card-hover border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            Tracking
          </div>
          <Badge variant="outline" className="text-xs">
            {connectedCount}/{services.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {/* Summary */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border mb-2"
        >
          <div className="flex items-center gap-2">
            {services.filter(s => s.connected).slice(0, 2).map(s => (
              <div key={s.id} className="w-6 h-6 rounded bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                {s.icon}
              </div>
            ))}
            <span className="text-xs text-muted-foreground">
              {connectedCount > 0 ? `${connectedCount} conectado${connectedCount > 1 ? 's' : ''}` : "Nenhum conectado"}
            </span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
        </button>

        {/* Expandable List */}
        {isExpanded && (
          <div className="space-y-2">
            {/* MAL Connection - Special handling */}
            <div className={cn(
              "p-2 rounded-md border transition-colors",
              malConnected 
                ? "bg-secondary/30 border-green-500/20" 
                : "bg-secondary/20 border-border"
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
                    malConnected 
                      ? "bg-primary/20 text-primary" 
                      : "bg-secondary text-muted-foreground"
                  )}>
                    MAL
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-foreground">MyAnimeList</span>
                      {malConnected ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <XCircle className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    {malConnected && malUser && (
                      <span className="text-xs text-muted-foreground">
                        @{malUser.username} • {malUser.statistics.total_entries} animes
                      </span>
                    )}
                  </div>
                </div>
                {malConnected && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs px-2 text-destructive hover:text-destructive"
                    onClick={disconnect}
                  >
                    Desconectar
                  </Button>
                )}
              </div>
              
              {/* MAL Username Input */}
              {!malConnected && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Seu username do MAL"
                      value={malUsername}
                      onChange={(e) => setMalUsername(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleMALConnect()}
                      className="h-8 text-xs"
                      disabled={isConnecting}
                    />
                    <Button 
                      size="sm" 
                      className="h-8 text-xs px-3"
                      onClick={handleMALConnect}
                      disabled={!malUsername.trim() || isConnecting}
                    >
                      {isConnecting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Conectar"
                      )}
                    </Button>
                  </div>
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Insira seu username para sincronizar sua lista
                  </p>
                </div>
              )}
              
              {/* MAL Stats when connected */}
              {malConnected && malUser && (
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border">
                  <div className="text-center">
                    <div className="text-sm font-bold text-primary">{malUser.statistics.watching}</div>
                    <div className="text-xs text-muted-foreground">Assistindo</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-green-500">{malUser.statistics.completed}</div>
                    <div className="text-xs text-muted-foreground">Completos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-yellow-500">{malUser.statistics.mean_score.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Nota Media</div>
                  </div>
                </div>
              )}
            </div>

            {/* Other services */}
            {services.filter(s => s.id !== "mal").map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-2 rounded-md border bg-secondary/20 border-border"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold bg-secondary text-muted-foreground">
                    {service.icon}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-foreground">{service.name}</span>
                    <XCircle className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">Em breve</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
