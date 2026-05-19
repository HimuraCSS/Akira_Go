"use client"

import { Plug, CheckCircle, XCircle, AlertCircle, Subtitles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useStreaming, type Provider } from "./streaming-context"
import type { ConsumetProvider } from "@/lib/consumet-api"

export function ProvidersCard() {
  const { providers, activeProvider, setActiveProvider, toggleProvider } = useStreaming()

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

  const handleToggle = (providerId: string, enabled: boolean) => {
    toggleProvider(providerId as ConsumetProvider, enabled)
  }

  const handleSelectProvider = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId)
    if (provider?.enabled && provider.status !== "offline") {
      setActiveProvider(providerId as ConsumetProvider)
    }
  }

  return (
    <Card className="glass-card glass-card-hover border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Plug className="w-5 h-5 text-primary" />
          Provedores de Streaming
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            onClick={() => handleSelectProvider(provider.id)}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
              activeProvider === provider.id 
                ? "bg-primary/10 border-primary/50" 
                : "bg-secondary/30 border-border hover:border-primary/30"
            } ${provider.status === "offline" ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(provider.status)}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{provider.name}</p>
                  {activeProvider === provider.id && (
                    <Badge className="bg-primary/20 text-primary text-xs border-none">
                      Ativo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {provider.latency && (
                    <p className="text-xs text-muted-foreground">{provider.latency}ms</p>
                  )}
                  {provider.hasSubtitles && (
                    <div className="flex items-center gap-1">
                      <Subtitles className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">
                        {provider.languages.includes("Portuguese") ? "PT-BR" : "EN"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(provider.status)}
              <Switch 
                checked={provider.enabled}
                onCheckedChange={(checked) => handleToggle(provider.id, checked)}
                onClick={(e) => e.stopPropagation()}
                disabled={provider.status === "offline"}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        ))}

        {/* Subtitle Info */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Subtitles className="w-4 h-4" />
              <span>Legendas PT-BR disponíveis</span>
            </div>
            <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/10">
              Zoro
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
