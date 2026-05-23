"use client"

import { Plug, CheckCircle, XCircle, AlertCircle, ChevronDown, Server, Tv, Globe, Languages } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useStreaming, type Provider } from "./streaming-context"
import { ShokoSettings } from "./shoko-settings"
import { SeanimeSettings } from "./seanime-settings"
import type { ConsumetProvider } from "@/lib/consumet-api"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function ProvidersCard() {
  const { providers, activeProvider, setActiveProvider, toggleProvider } = useStreaming()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showShoko, setShowShoko] = useState(false)
  const [showSeanime, setShowSeanime] = useState(false)

  const getStatusColor = (status: Provider["status"]) => {
    switch (status) {
      case "online": return "bg-green-500"
      case "offline": return "bg-destructive"
      case "degraded": return "bg-yellow-500"
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

  const activeProviderData = providers.find(p => p.id === activeProvider)
  const enabledCount = providers.filter(p => p.enabled).length
  const ptbrCount = providers.filter(p => p.enabled && p.languages?.includes("Portuguese")).length

  return (
    <Card className="glass-card glass-card-hover border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plug className="w-4 h-4 text-primary" />
            Provedores
          </div>
          <Badge variant="outline" className="text-xs">
            {enabledCount} ativos
          </Badge>
          {ptbrCount > 0 && (
            <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-500">
              {ptbrCount} PT-BR
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {/* Active Provider Summary */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/30 mb-2"
        >
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", getStatusColor(activeProviderData?.status || "offline"))} />
            <span className="text-sm font-medium text-foreground">{activeProviderData?.name || "Nenhum"}</span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
        </button>

        {/* Expandable Provider List */}
        {isExpanded && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {providers.map((provider) => (
              <div
                key={provider.id}
                onClick={() => handleSelectProvider(provider.id)}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md border transition-all cursor-pointer",
                  activeProvider === provider.id 
                    ? "bg-primary/10 border-primary/50" 
                    : "bg-secondary/30 border-border hover:border-primary/30",
                  provider.status === "offline" && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", getStatusColor(provider.status))} />
                  <span className="text-xs font-medium text-foreground">{provider.name}</span>
                  {provider.languages?.includes("Portuguese") && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-green-500/20 text-green-500">
                      PT-BR
                    </Badge>
                  )}
                  {provider.latency && (
                    <span className="text-xs text-muted-foreground">{provider.latency}ms</span>
                  )}
                </div>
                <Switch 
                  checked={provider.enabled}
                  onCheckedChange={(checked) => handleToggle(provider.id, checked)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={provider.status === "offline"}
                  className="scale-75 data-[state=checked]:bg-primary"
                />
              </div>
            ))}
            
            {/* Shoko Server Option */}
            <button
              onClick={() => { setShowShoko(!showShoko); setShowSeanime(false) }}
              className="w-full flex items-center justify-between p-2 rounded-md border bg-secondary/30 border-border hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-2">
                <Server className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-foreground">Shoko Server</span>
                <Badge variant="outline" className="text-xs scale-90">Local</Badge>
              </div>
              <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", showShoko && "rotate-180")} />
            </button>
            
            {/* Seanime Option */}
            <button
              onClick={() => { setShowSeanime(!showSeanime); setShowShoko(false) }}
              className="w-full flex items-center justify-between p-2 rounded-md border bg-secondary/30 border-border hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-2">
                <Tv className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-foreground">Seanime</span>
                <Badge variant="outline" className="text-xs scale-90">Local</Badge>
              </div>
              <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", showSeanime && "rotate-180")} />
            </button>
          </div>
        )}
        
        {/* Shoko Settings Panel */}
        {showShoko && (
          <div className="mt-3 pt-3 border-t border-border">
            <ShokoSettings />
          </div>
        )}
        
        {/* Seanime Settings Panel */}
        {showSeanime && (
          <div className="mt-3 pt-3 border-t border-border">
            <SeanimeSettings />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
