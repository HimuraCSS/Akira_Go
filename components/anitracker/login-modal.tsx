"use client"

import { useState } from "react"
import { X, Loader2, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useMALAuth } from "@/components/anitracker/mal-auth-context"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, isLoading } = useMALAuth()
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleLogin = () => {
    setError(null)
    try {
      login()
    } catch {
      setError("Erro ao iniciar login. Tente novamente.")
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
          <div className="absolute inset-0 bg-[url('/logo.png')] bg-center bg-no-repeat opacity-10" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
          
          {/* Logo centered */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <div className="w-20 h-20 rounded-2xl bg-card border-4 border-card shadow-xl flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="AKIRA Go"
                width={64}
                height={64}
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-14 pb-8 px-8">
          <h2 className="text-2xl font-bold text-center text-foreground mb-2">
            Entrar no AKIRA Go
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Conecte sua conta do MyAnimeList para sincronizar sua lista e acompanhar seu progresso
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Features */}
          <div className="space-y-3 mb-6">
            {[
              "Sincronize sua lista de animes automaticamente",
              "Acompanhe episodios assistidos em tempo real",
              "Receba recomendacoes personalizadas",
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Login Button */}
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full h-12 bg-[#2E51A2] hover:bg-[#2E51A2]/90 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#2E51A2]/25"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <svg 
                  className="w-5 h-5 mr-2" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Entrar com MyAnimeList
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-card text-muted-foreground">ou continue sem conta</span>
            </div>
          </div>

          {/* Guest Button */}
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full h-10 rounded-xl border-border hover:bg-secondary"
          >
            Continuar como Visitante
          </Button>

          {/* Footer */}
          <p className="mt-6 text-xs text-center text-muted-foreground">
            Ao entrar, voce concorda com nossos{" "}
            <a href="#" className="text-primary hover:underline">Termos</a>
            {" "}e{" "}
            <a href="#" className="text-primary hover:underline">Politica de Privacidade</a>
          </p>

          {/* MAL Link */}
          <a
            href="https://myanimelist.net/register.php"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Nao tem conta no MyAnimeList?
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
