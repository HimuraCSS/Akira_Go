"use client"

import { useState } from "react"
import { X, Loader2, ExternalLink, AlertCircle, CheckCircle2, Mail, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMALAuth } from "@/components/anitracker/mal-auth-context"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

type AuthMode = "options" | "login" | "register"

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, isLoading } = useMALAuth()
  const [error, setError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>("options")
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleMALLogin = () => {
    setError(null)
    try {
      login()
    } catch {
      setError("Erro ao iniciar login. Tente novamente.")
    }
  }

  const handleGoogleLogin = () => {
    setError(null)
    // TODO: Implement Google OAuth
    setError("Login com Google em breve!")
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (authMode === "register") {
        if (formData.password !== formData.confirmPassword) {
          setError("As senhas nao coincidem")
          setIsSubmitting(false)
          return
        }
        if (formData.password.length < 6) {
          setError("A senha deve ter pelo menos 6 caracteres")
          setIsSubmitting(false)
          return
        }
        // TODO: Implement registration with Supabase
        setError("Registro com email em breve!")
      } else {
        // TODO: Implement login with Supabase
        setError("Login com email em breve!")
      }
    } catch {
      setError("Erro ao processar. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetModal = () => {
    setAuthMode("options")
    setError(null)
    setFormData({ email: "", password: "", name: "", confirmPassword: "" })
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="relative h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
          
          {/* Logo centered */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
            <div className="w-16 h-16 rounded-xl bg-card border-4 border-card shadow-xl flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="AKIRA Go"
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-12 pb-6 px-6">
          {authMode === "options" && (
            <>
              <h2 className="text-xl font-bold text-center text-foreground mb-1">
                Bem-vindo ao AKIRA Go
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-5">
                Escolha como deseja continuar
              </p>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Auth Options */}
              <div className="space-y-3 mb-4">
                {/* Google Login */}
                <Button
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="w-full h-11 rounded-xl border-border hover:bg-secondary justify-start gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continuar com Google</span>
                </Button>

                {/* MAL Login */}
                <Button
                  onClick={handleMALLogin}
                  disabled={isLoading}
                  className="w-full h-11 bg-[#2E51A2] hover:bg-[#2E51A2]/90 text-white rounded-xl justify-start gap-3"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  )}
                  <span>{isLoading ? "Conectando..." : "Continuar com MyAnimeList"}</span>
                </Button>

                {/* Email Login */}
                <Button
                  onClick={() => setAuthMode("login")}
                  variant="outline"
                  className="w-full h-11 rounded-xl border-border hover:bg-secondary justify-start gap-3"
                >
                  <Mail className="w-5 h-5" />
                  <span>Continuar com Email</span>
                </Button>
              </div>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">ou</span>
                </div>
              </div>

              {/* Guest Button */}
              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground"
              >
                Continuar como Visitante
              </Button>

              {/* Features */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  Ao criar uma conta voce pode:
                </p>
                <div className="space-y-1.5">
                  {[
                    "Sincronizar lista de animes",
                    "Continuar de onde parou",
                    "Receber recomendacoes",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Email Login Form */}
          {authMode === "login" && (
            <>
              <button
                onClick={() => setAuthMode("options")}
                className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>

              <h2 className="text-xl font-bold text-foreground mb-1">Entrar</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Use seu email e senha para entrar
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="********"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
                </Button>
              </form>

              <p className="mt-4 text-sm text-center text-muted-foreground">
                Nao tem conta?{" "}
                <button
                  onClick={() => setAuthMode("register")}
                  className="text-primary hover:underline"
                >
                  Criar agora
                </button>
              </p>
            </>
          )}

          {/* Register Form */}
          {authMode === "register" && (
            <>
              <button
                onClick={() => setAuthMode("options")}
                className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>

              <h2 className="text-xl font-bold text-foreground mb-1">Criar Conta</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Preencha os dados para criar sua conta
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 caracteres"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="********"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="h-10"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl mt-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar Conta"}
                </Button>
              </form>

              <p className="mt-4 text-sm text-center text-muted-foreground">
                Ja tem conta?{" "}
                <button
                  onClick={() => setAuthMode("login")}
                  className="text-primary hover:underline"
                >
                  Entrar
                </button>
              </p>
            </>
          )}

          {/* Footer */}
          <p className="mt-4 text-xs text-center text-muted-foreground">
            Ao continuar, voce concorda com nossos{" "}
            <a href="#" className="text-primary hover:underline">Termos</a>
            {" "}e{" "}
            <a href="#" className="text-primary hover:underline">Privacidade</a>
          </p>
        </div>
      </div>
    </div>
  )
}
