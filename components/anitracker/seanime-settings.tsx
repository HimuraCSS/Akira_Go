"use client"

import { useState, useEffect } from "react"
import { Server, Check, X, Loader2, Eye, EyeOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface SeanimeConfig {
  url: string
  token: string | null
  version: string | null
}

export function SeanimeSettings() {
  const [config, setConfig] = useState<SeanimeConfig>({
    url: "",
    token: null,
    version: null,
  })
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load config from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("seanime_config")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setConfig(parsed)
        setIsConnected(!!parsed.version)
      } catch {
        // Invalid config
      }
    }
  }, [])

  const handleConnect = async () => {
    if (!config.url) {
      setError("URL is required")
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const response = await fetch("/api/seanime/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: config.url,
          username: username || undefined,
          password: password || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect")
      }

      const newConfig = {
        url: config.url,
        token: data.token || null,
        version: data.version,
      }

      setConfig(newConfig)
      setIsConnected(true)
      localStorage.setItem("seanime_config", JSON.stringify(newConfig))
      
      // Clear credentials after successful connection
      setUsername("")
      setPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed")
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    setConfig({ url: "", token: null, version: null })
    setIsConnected(false)
    localStorage.removeItem("seanime_config")
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Server className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Seanime</span>
        {isConnected && (
          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
            v{config.version}
          </Badge>
        )}
      </div>

      {!isConnected ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Server URL</Label>
            <Input
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="http://localhost:43211"
              className="h-8 text-sm bg-secondary/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Username (opcional)</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="h-8 text-sm bg-secondary/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Password (opcional)</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="h-8 text-sm bg-secondary/50 pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <Button
            onClick={handleConnect}
            disabled={isConnecting || !config.url}
            size="sm"
            className="w-full h-8"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 mr-2" />
                Connect
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Seanime server must be running on your network
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-2 rounded-md bg-secondary/50 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground truncate max-w-[180px]">
                  {config.url}
                </p>
                <p className="text-xs text-muted-foreground">
                  {config.token ? "Authenticated" : "No auth"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleConnect}
                  title="Refresh connection"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={handleDisconnect}
                  title="Disconnect"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Connected to Seanime. Your local library is available.
          </p>
        </div>
      )}
    </div>
  )
}

// Hook to get Seanime config
export function useSeanimeConfig() {
  const [config, setConfig] = useState<SeanimeConfig | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("seanime_config")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setConfig(parsed)
        setIsConnected(!!parsed.version)
      } catch {
        setConfig(null)
        setIsConnected(false)
      }
    }
  }, [])

  return { config, isConnected }
}
