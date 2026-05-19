"use client"

import { Plug, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

interface Provider {
  id: string
  name: string
  status: "online" | "offline" | "degraded"
  enabled: boolean
  latency?: number
}

const providers: Provider[] = [
  { id: "consumet", name: "Consumet API", status: "online", enabled: true, latency: 45 },
  { id: "gogoanime", name: "GogoAnime", status: "online", enabled: true, latency: 120 },
  { id: "zoro", name: "Zoro/Anicrush", status: "degraded", enabled: true, latency: 250 },
  { id: "animepahe", name: "AnimePahe", status: "offline", enabled: false },
]

export function ProvidersCard() {
  const getStatusIcon = (status: Provider["status"]) => {
    switch (status) {
      case "online":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "offline":
        return <XCircle className="w-4 h-4 text-destructive" />
      case "degraded":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: Provider["status"]) => {
    switch (status) {
      case "online":
        return (
          <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/10 text-xs">
            Online
          </Badge>
        )
      case "offline":
        return (
          <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/10 text-xs">
            Offline
          </Badge>
        )
      case "degraded":
        return (
          <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 bg-yellow-500/10 text-xs">
            Lento
          </Badge>
        )
    }
  }

  return (
    <Card className="glass-card glass-card-hover border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Plug className="w-5 h-5 text-primary" />
          Provedores Instalados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(provider.status)}
              <div>
                <p className="text-sm font-medium text-foreground">{provider.name}</p>
                {provider.latency && (
                  <p className="text-xs text-muted-foreground">{provider.latency}ms</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(provider.status)}
              <Switch 
                checked={provider.enabled} 
                disabled={provider.status === "offline"}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        ))}

        {/* CORS Proxy Status */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Proxy Status (CORS Bypassed)</span>
            <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/10">
              Ativo
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
