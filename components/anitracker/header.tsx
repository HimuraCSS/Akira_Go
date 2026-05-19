"use client"

import { useState, useRef, useEffect } from "react"
import { Menu, Search, Bell, User, X, Loader2 } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useAnimeSearch } from "@/hooks/use-anime"
import { useDebounce } from "@/hooks/use-debounce"

export function Header() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden text-foreground">
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
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
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Início
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Descobrir
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Minha Lista
            </a>
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Agenda
            </a>
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
                            // In a real app, navigate to anime detail page
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
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
