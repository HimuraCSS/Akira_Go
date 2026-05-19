"use client"

import { useState } from "react"
import { X, Plus, Trash2, CheckCircle, AlertCircle, Loader2, RefreshCw, Plug, Subtitles, ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStreaming, type Addon } from "./streaming-context"

interface AddonsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddonsModal({ open, onOpenChange }: AddonsModalProps) {
  const { addons, providers, activeProvider, addAddon, removeAddon, testAddon, setActiveProvider } = useStreaming()
  const [newUrl, setNewUrl] = useState("")
  const [addonType, setAddonType] = useState<Addon["type"]>("scraper")
  const [isAdding, setIsAdding] = useState(false)

  const handleAddAddon = async () => {
    if (!newUrl) return
    
    setIsAdding(true)
    await addAddon(newUrl, addonType)
    setIsAdding(false)
    setNewUrl("")
  }

  const handleRemoveAddon = (id: string) => {
    removeAddon(id)
  }

  const handleTestAddon = async (id: string) => {
    await testAddon(id)
  }

  const getStatusIcon = (status: Addon["status"]) => {
    switch (status) {
      case "online":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "offline":
        return <AlertCircle className="w-4 h-4 text-destructive" />
      case "testing":
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
    }
  }

  const getTypeIcon = (type: Addon["type"]) => {
    switch (type) {
      case "scraper":
        return <Plug className="w-3 h-3" />
      case "tracker":
        return <ListChecks className="w-3 h-3" />
      case "subtitle":
        return <Subtitles className="w-3 h-3" />
    }
  }

  const getTypeBadge = (type: Addon["type"]) => {
    const colors = {
      scraper: "border-primary/30 text-primary bg-primary/10",
      tracker: "border-blue-500/30 text-blue-500 bg-blue-500/10",
      subtitle: "border-green-500/30 text-green-500 bg-green-500/10",
    }
    const labels = {
      scraper: "Scraper",
      tracker: "Tracker",
      subtitle: "Legendas",
    }
    return (
      <Badge variant="outline" className={`text-xs gap-1 ${colors[type]}`}>
        {getTypeIcon(type)}
        {labels[type]}
      </Badge>
    )
  }

  const activeProviderData = providers.find(p => p.id === activeProvider)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Plug className="w-5 h-5 text-primary" />
            Gerenciar Add-ons
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Adicione ou remova provedores de streaming. Os add-ons ativos sincronizam automaticamente com o player.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Active Provider */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Provedor Ativo</p>
                <p className="text-sm font-medium text-foreground">{activeProviderData?.name || "Nenhum"}</p>
              </div>
              <Badge className="bg-primary/20 text-primary border-none">
                {activeProviderData?.status === "online" ? "Conectado" : "Offline"}
              </Badge>
            </div>
          </div>

          {/* Add New Addon */}
          <div className="space-y-2">
            <Label htmlFor="addon-url" className="text-foreground">
              Adicionar Novo Add-on
            </Label>
            <div className="flex gap-2">
              <Input
                id="addon-url"
                placeholder="https://example.com/manifest.json"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground flex-1"
              />
              <Select value={addonType} onValueChange={(v) => setAddonType(v as Addon["type"])}>
                <SelectTrigger className="w-[120px] bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="scraper">Scraper</SelectItem>
                  <SelectItem value="tracker">Tracker</SelectItem>
                  <SelectItem value="subtitle">Legendas</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddAddon} 
                disabled={!newUrl || isAdding}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Suporta manifests do tipo Stremio, Consumet, e scrapers personalizados
            </p>
          </div>

          {/* Installed Addons List */}
          <div className="space-y-2">
            <Label className="text-foreground">Add-ons Instalados ({addons.length})</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {addons.map((addon) => {
                const isActive = addon.providerId === activeProvider
                return (
                  <div
                    key={addon.id}
                    onClick={() => addon.providerId && addon.status === "online" && setActiveProvider(addon.providerId)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      addon.providerId ? "cursor-pointer" : ""
                    } ${
                      isActive 
                        ? "bg-primary/10 border-primary/50" 
                        : "bg-secondary/30 border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getStatusIcon(addon.status)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {addon.name}
                          </p>
                          {getTypeBadge(addon.type)}
                          {isActive && (
                            <Badge className="bg-green-500/20 text-green-400 border-none text-xs">
                              Ativo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {addon.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTestAddon(addon.id)
                        }}
                        disabled={addon.status === "testing"}
                      >
                        <RefreshCw className={`w-4 h-4 ${addon.status === "testing" ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveAddon(addon.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {addons.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Plug className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum add-on instalado</p>
                  <p className="text-xs">Adicione um add-on para comecar</p>
                </div>
              )}
            </div>
          </div>

          {/* Sync Status */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-foreground">
                Sincronizacao com Player
              </h4>
              <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/10 text-xs">
                Ativo
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add-ons do tipo Scraper aparecem automaticamente no seletor de fontes do player. 
              Clique em um add-on para defini-lo como provedor ativo.
            </p>
          </div>

          {/* Info Section */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="text-sm font-medium text-foreground mb-1">
              Como funciona?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O AKIRA Go usa uma arquitetura desacoplada inspirada no Stremio. 
              Os add-ons fornecem links de streaming via HLS, enquanto o player 
              gerencia a reproducao. CORS e contornado via proxy serverless.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-foreground hover:bg-secondary"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
