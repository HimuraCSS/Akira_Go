"use client"

import { Link2, CheckCircle, XCircle, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface TrackingService {
  id: string
  name: string
  icon: string
  connected: boolean
  username?: string
  syncedItems?: number
}

const services: TrackingService[] = [
  { 
    id: "anilist", 
    name: "AniList", 
    icon: "AL",
    connected: true, 
    username: "@otaku_master",
    syncedItems: 247
  },
  { 
    id: "mal", 
    name: "MyAnimeList", 
    icon: "MAL",
    connected: false 
  },
  { 
    id: "kitsu", 
    name: "Kitsu", 
    icon: "K",
    connected: true,
    username: "anime_lover",
    syncedItems: 189
  },
]

export function TrackingCard() {
  const [isExpanded, setIsExpanded] = useState(false)
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
            {connectedCount}/{services.length} conectados
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
              {connectedCount > 0 ? `${connectedCount} servicos conectados` : "Nenhum conectado"}
            </span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
        </button>

        {/* Expandable List */}
        {isExpanded && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {services.map((service) => (
              <div
                key={service.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md border transition-colors",
                  service.connected 
                    ? "bg-secondary/30 border-green-500/20" 
                    : "bg-secondary/20 border-border"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
                    service.connected 
                      ? "bg-primary/20 text-primary" 
                      : "bg-secondary text-muted-foreground"
                  )}>
                    {service.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-foreground">{service.name}</span>
                      {service.connected ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <XCircle className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    {service.connected && (
                      <span className="text-xs text-muted-foreground">{service.syncedItems} itens</span>
                    )}
                  </div>
                </div>
                {!service.connected && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                    Conectar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
