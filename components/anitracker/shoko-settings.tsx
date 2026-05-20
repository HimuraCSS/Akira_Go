"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Server, Check, X, ExternalLink } from "lucide-react"

interface ShokoConfig {
  baseUrl: string
  apiKey: string
  connected: boolean
  version?: string
  username?: string
}

const SHOKO_CONFIG_KEY = "akira-shoko-config"

export function ShokoSettings() {
  const [config, setConfig] = useState<ShokoConfig>({
    baseUrl: "",
    apiKey: "",
    connected: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load saved config on mount
  useEffect(() => {
    const saved = localStorage.getItem(SHOKO_CONFIG_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setConfig(parsed)
      } catch {
        // Invalid saved config
      }
    }
  }, [])

  const handleConnect = async () => {
    if (!config.baseUrl || !config.apiKey) {
      setError("URL e API Key sao obrigatorios")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/shoko/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const newConfig: ShokoConfig = {
          ...config,
          connected: true,
          version: data.version,
          username: data.user?.username,
        }
        setConfig(newConfig)
        localStorage.setItem(SHOKO_CONFIG_KEY, JSON.stringify(newConfig))
        setSuccess(`Conectado ao Shoko Server v${data.version}`)
      } else {
        setError(data.error || "Falha ao conectar")
        setConfig(prev => ({ ...prev, connected: false }))
      }
    } catch (err) {
      setError("Erro de conexao. Verifique a URL.")
      setConfig(prev => ({ ...prev, connected: false }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    const newConfig: ShokoConfig = {
      baseUrl: config.baseUrl,
      apiKey: "",
      connected: false,
    }
    setConfig(newConfig)
    localStorage.setItem(SHOKO_CONFIG_KEY, JSON.stringify(newConfig))
    setSuccess(null)
    setError(null)
  }

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Shoko Server</CardTitle>
          </div>
          {config.connected && (
            <Badge variant="outline" className="text-green-500 border-green-500/30">
              <Check className="w-3 h-3 mr-1" />
              Conectado
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Conecte sua biblioteca local de anime gerenciada pelo Shoko
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {config.connected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">{config.baseUrl}</p>
                <p className="text-xs text-muted-foreground">
                  Versao: {config.version} {config.username && `• Usuario: ${config.username}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(`${config.baseUrl}`, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Shoko Web UI
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="shoko-url" className="text-xs">URL do Servidor</Label>
              <Input
                id="shoko-url"
                type="url"
                placeholder="http://localhost:8111"
                value={config.baseUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shoko-key" className="text-xs">API Key</Label>
              <Input
                id="shoko-key"
                type="password"
                placeholder="Sua API Key do Shoko"
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Encontre em Shoko Server → Settings → API Keys
              </p>
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            
            {success && (
              <p className="text-xs text-green-500">{success}</p>
            )}

            <Button
              onClick={handleConnect}
              disabled={isLoading || !config.baseUrl || !config.apiKey}
              className="w-full h-9"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Server className="w-4 h-4 mr-2" />
                  Conectar
                </>
              )}
            </Button>
          </div>
        )}
        
        <div className="pt-2 border-t border-border">
          <a
            href="https://shokoanime.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Saiba mais sobre o Shoko Server
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Hook to get Shoko config
 */
export function useShokoConfig(): ShokoConfig | null {
  const [config, setConfig] = useState<ShokoConfig | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(SHOKO_CONFIG_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.connected) {
          setConfig(parsed)
        }
      } catch {
        // Invalid saved config
      }
    }
  }, [])

  return config
}

/**
 * Hook to fetch from Shoko API with auth headers
 */
export function useShokoFetch() {
  const config = useShokoConfig()

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    if (!config?.connected) {
      throw new Error("Shoko nao conectado")
    }

    return fetch(`/api/shoko${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        "x-shoko-url": config.baseUrl,
        "x-shoko-apikey": config.apiKey,
      },
    })
  }

  return { fetchWithAuth, isConnected: !!config?.connected, config }
}
