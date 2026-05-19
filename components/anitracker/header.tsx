"use client"

import { useState, useRef, useEffect } from "react"
import { Menu, Search, Bell, User, X, Loader2, LogOut, Settings } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAnimeSearch } from "@/hooks/use-anime"
import { useDebounce } from "@/hooks/use-debounce"
import { useMALAuth } from "@/components/anitracker/mal-auth-context"

const NAV_ITEMS = [
  { href: "/", label: "Início" },
  { href: "/descobrir", label: "Descobrir" },
  { href: "/minha-lista", label: "Minha Lista" },
  { href: "/agenda", label: "Agenda" },
]

export function Header() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  
  const { user, isAuthenticated, isLoading: isAuthLoading, login, logout } = useMALAuth()
  
  // Debounce search to avoid too many API calls
  const debouncedQuery = useDebounce(searchQuery, 400)
  const { results, isLoading } = useAnimeSearch(debouncedQuery, 8)

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearchFocus = () => {
    setIsSearchOpen(true)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setIsSearchOpen(false)
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="AKIRA Go"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
              <span className="text-xl font-bold text-foreground">
                AKIRA <span className="text-primary">Go</span>
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="block h-0.5 bg-primary mt-1 rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
            {/* Desktop Search with Dropdown */}
            <div ref={searchRef} className="hidden md:block relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar anime..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  className="w-64 pl-10 pr-8 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {isSearchOpen && searchQuery && (
                <div className="absolute top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                  {isLoading ? (
                    <div className="p-4 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
                    </div>
                  ) : results.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto">
                      {results.map((anime) => (
                        <button
                          key={anime.id}
                          onClick={() => {
                            clearSearch()
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                        >
                          <div className="w-12 h-16 relative rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={anime.image}
                              alt={anime.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-foreground truncate">
                              {anime.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {anime.year} • {anime.episodes || "?"} eps
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-yellow-400">★</span>
                              <span className="text-xs text-muted-foreground">
                                {anime.score?.toFixed(1) || "N/A"}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum resultado para &ldquo;{searchQuery}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center bg-primary text-primary-foreground text-[10px]">
                3
              </Badge>
            </Button>
            
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground md:hidden">
              <Search className="w-5 h-5" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary">
                  {isAuthenticated && user?.picture ? (
                    <Image
                      src={user.picture}
                      alt={user.name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAuthLoading ? (
                  <div className="p-4 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : isAuthenticated && user ? (
                  <>
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.anime_statistics?.num_items_completed || 0} animes completos
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/minha-lista" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Minha Lista
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/descobrir" className="cursor-pointer">
                        <Search className="w-4 h-4 mr-2" />
                        Descobrir
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-2" />
                      Configurações
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-500 focus:text-red-500">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-2">
                      <p className="text-sm text-muted-foreground">
                        Conecte sua conta para sincronizar sua lista
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={login} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Entrar com MyAnimeList
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
