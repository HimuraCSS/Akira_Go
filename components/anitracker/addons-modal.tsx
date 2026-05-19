"use client"

import { useState } from "react"
import { X, Plus, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
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

interface Addon {
  id: string
  name: string
  url: string
  status: "testing" | "online" | "offline"
  type: "scraper" | "tracker" | "subtitle"
}

const defaultAddons: Addon[] = [
  { id: "1", name: "Consumet API", url: "https://api.consumet.org", status: "online", type: "scraper" },
  { id: "2", name: "GogoAnime Provider", url: "https://gogoanime.provider.com", status: "online", type: "scraper" },
  { id: "3", name: "Zoro Scraper", url: "https://zoro.scraper.net", status: "offline", type: "scraper" },
]

interface AddonsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddonsModal({ open, onOpenChange }: AddonsModalProps) {
  const [addons, setAddons] = useState<Addon[]>(defaultAddons)
  const [newUrl, setNewUrl] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleAddAddon = async () => {
    if (!newUrl) return
    
    setIsAdding(true)
    
    // Simulate testing the addon
    const newAddon: Addon = {
      id: Date.now().toString(),
      name: `Provider Personalizado`,
      url: newUrl,
      status: "testing",
      type: "scraper",
    }
    
    setAddons([...addons, newAddon])
    
    // Simulate API test
    setTimeout(() => {
      setAddons(prev => prev.map(addon => 
        addon.id === newAddon.id 
          ? { ...addon, status: "online" as const, name: `Custom Provider ${addon.id.slice(-4)}` }
          : addon
      ))
      setIsAdding(false)
      setNewUrl("")
    }, 2000)
  }

  const handleRemoveAddon = (id: string) => {
    setAddons(addons.filter(addon => addon.id !== id))
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
      <Badge variant="outline" className={`text-xs ${colors[type]}`}>
        {labels[type]}
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            Gerenciar Add-ons
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Adicione ou remova provedores de streaming. Cole a URL do manifest para instalar novos scrapers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add New Addon */}
          <div className="space-y-2">
            <Label htmlFor="addon-url" className="text-foreground">
              URL do Provider
            </Label>
            <div className="flex gap-2">
              <Input
                id="addon-url"
                placeholder="https://example.com/manifest.json"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
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
            <Label className="text-foreground">Add-ons Instalados</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(addon.status)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {addon.name}
                        </p>
                        {getTypeBadge(addon.type)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {addon.url}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleRemoveAddon(addon.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Info Section */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <h4 className="text-sm font-medium text-foreground mb-1">
              Como funciona?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O AniTracker usa uma arquitetura desacoplada inspirada no Stremio. 
              Os add-ons fornecem links de streaming via HLS, enquanto o player 
              gerencia a reprodução. CORS é contornado via proxy serverless.
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
