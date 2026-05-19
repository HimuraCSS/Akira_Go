"use client"

import { Link2, CheckCircle, XCircle, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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
  return (
    <Card className="glass-card glass-card-hover border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          Serviços de Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {services.map((service) => (
          <div
            key={service.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              service.connected 
                ? "bg-secondary/30 border-green-500/20 hover:border-green-500/40" 
                : "bg-secondary/20 border-border hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${
                service.connected 
                  ? "bg-primary/20 text-primary border border-primary/30" 
                  : "bg-secondary text-muted-foreground border border-border"
              }`}>
                {service.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{service.name}</p>
                  {service.connected ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                {service.connected ? (
                  <p className="text-xs text-muted-foreground">
                    {service.username} • {service.syncedItems} itens sincronizados
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Não conectado</p>
                )}
              </div>
            </div>
            <Button 
              variant={service.connected ? "ghost" : "outline"} 
              size="sm"
              className={service.connected 
                ? "text-muted-foreground hover:text-foreground" 
                : "border-primary/30 text-primary hover:bg-primary/10"
              }
            >
              {service.connected ? (
                <ExternalLink className="w-4 h-4" />
              ) : (
                "Conectar"
              )}
            </Button>
          </div>
        ))}

        {/* Auto-sync status */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Auto-sync ativado</span>
            <span className="text-green-500">Última sync: 5 min atrás</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
