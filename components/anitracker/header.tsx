"use client"

import { Zap, Menu, Search, Bell, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export function Header() {
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
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Ani<span className="text-primary">Tracker</span>
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
            <div className="hidden md:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar anime..."
                className="w-64 pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
              />
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
