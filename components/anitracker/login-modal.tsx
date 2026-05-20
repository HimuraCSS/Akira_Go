"use client"

import { useState } from "react"
import { X, Loader2, AlertCircle, CheckCircle2, Mail, Lock, User, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

type AuthMode = "login" | "signup" | "guest-prompt"

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, setGuestMode, isLoading } = useAuth()
  const [mode, setMode] = useState<AuthMode>("guest-prompt")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleGoogleLogin = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError("Erro ao conectar com Google. Tente novamente.")
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      if (mode === "login") {
        const { error } = await signInWithEmail(email, password)
        if (error) {
          setError(error.message)
        } else {
          onClose()
        }
      } else if (mode === "signup") {
        const { error } = await signUpWithEmail(email, password, displayName)
        if (error) {
          setError(error.message)
        } else {
          setSuccess("Conta criada! Verifique seu email para confirmar.")
        }
      }
    } catch {
      setError("Erro ao processar. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGuestContinue = () => {
    setGuestMode(true)
    onClose()
  }

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setDisplayName("")
    setError(null)
    setSuccess(null)
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
        <div className="relative h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
          <button
            onClick={onClose}
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
          {mode === "guest-prompt" ? (
            <>
              <h2 className="text-xl font-bold text-center text-foreground mb-1">
                Bem-vindo ao AKIRA Go
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-5">
                Crie uma conta para salvar seu progresso ou continue como visitante
              </p>

              {/* Features */}
              <div className="space-y-2 mb-5 text-sm">
                {[
                  "Sincronize seu historico em todos os dispositivos",
                  "Continue assistindo de onde parou",
                  "Salve sua lista de animes favoritos",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Google Login */}
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full h-11 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-xl transition-all duration-200 border border-gray-300"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar com Google
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">ou</span>
                </div>
              </div>

              {/* Email options */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  onClick={() => { resetForm(); setMode("login") }}
                  className="flex-1 h-10 rounded-xl"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { resetForm(); setMode("signup") }}
                  className="flex-1 h-10 rounded-xl"
                >
                  <User className="w-4 h-4 mr-2" />
                  Criar conta
                </Button>
              </div>

              {/* Guest Button */}
              <Button
                variant="ghost"
                onClick={handleGuestContinue}
                className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground"
              >
                Continuar sem conta
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-center text-foreground mb-1">
                {mode === "login" ? "Entrar" : "Criar conta"}
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-5">
                {mode === "login" 
                  ? "Entre com seu email e senha" 
                  : "Preencha os dados para criar sua conta"}
              </p>

              {/* Error/Success Message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p className="text-sm text-green-500">{success}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                {mode === "signup" && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Nome de exibicao"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10 h-11 rounded-xl"
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11 rounded-xl"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 pr-10 h-11 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : mode === "login" ? (
                    "Entrar"
                  ) : (
                    "Criar conta"
                  )}
                </Button>
              </form>

              {/* Switch mode */}
              <p className="mt-4 text-sm text-center text-muted-foreground">
                {mode === "login" ? (
                  <>
                    Nao tem conta?{" "}
                    <button
                      onClick={() => { resetForm(); setMode("signup") }}
                      className="text-primary hover:underline"
                    >
                      Criar conta
                    </button>
                  </>
                ) : (
                  <>
                    Ja tem conta?{" "}
                    <button
                      onClick={() => { resetForm(); setMode("login") }}
                      className="text-primary hover:underline"
                    >
                      Entrar
                    </button>
                  </>
                )}
              </p>

              {/* Back button */}
              <Button
                variant="ghost"
                onClick={() => { resetForm(); setMode("guest-prompt") }}
                className="w-full h-10 mt-2 rounded-xl text-muted-foreground"
              >
                Voltar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
