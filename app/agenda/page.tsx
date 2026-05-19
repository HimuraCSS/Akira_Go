"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, Bell, BellOff, ChevronLeft, ChevronRight, Play, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAiringAnime } from "@/hooks/use-anime"
import type { AnimeData } from "@/components/anitracker/anime-card"

const DAYS_OF_WEEK = [
  { key: "sunday", label: "Domingo", short: "Dom" },
  { key: "monday", label: "Segunda", short: "Seg" },
  { key: "tuesday", label: "Terça", short: "Ter" },
  { key: "wednesday", label: "Quarta", short: "Qua" },
  { key: "thursday", label: "Quinta", short: "Qui" },
  { key: "friday", label: "Sexta", short: "Sex" },
  { key: "saturday", label: "Sábado", short: "Sáb" },
]

// Get current week dates
function getWeekDates(offset: number = 0): Date[] {
  const today = new Date()
  const currentDay = today.getDay()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - currentDay + (offset * 7))
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    return date
  })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

export default function AgendaPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  const [notifications, setNotifications] = useState<Set<string>>(new Set())
  
  const { animes: airingAnimes, isLoading } = useAiringAnime(50)
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  // Load notifications from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("anime_notifications")
    if (saved) {
      setNotifications(new Set(JSON.parse(saved)))
    }
  }, [])

  // Save notifications to localStorage
  const toggleNotification = (animeId: string) => {
    setNotifications(prev => {
      const newSet = new Set(prev)
      if (newSet.has(animeId)) {
        newSet.delete(animeId)
      } else {
        newSet.add(animeId)
      }
      localStorage.setItem("anime_notifications", JSON.stringify([...newSet]))
      return newSet
    })
  }

  // Simulate schedule distribution (in production, this would come from actual broadcast data)
  const scheduleByDay = useMemo(() => {
    const schedule: Record<number, AnimeData[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    }
    
    airingAnimes.forEach((anime, index) => {
      // Distribute animes across days based on index (simulation)
      const dayIndex = index % 7
      schedule[dayIndex].push(anime)
    })

    return schedule
  }, [airingAnimes])

  const todayAnimes = scheduleByDay[selectedDay] || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border">
        <div className="container mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Agenda</h1>
              <p className="text-sm text-muted-foreground">
                Calendário de lançamentos semanais
              </p>
            </div>
            <Badge variant="outline" className="hidden sm:flex">
              <Calendar className="w-3 h-3 mr-1" />
              {airingAnimes.length} em exibição
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 lg:px-8 py-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setWeekOffset(prev => prev - 1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
            </span>
            {weekOffset !== 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setWeekOffset(0)}
              >
                Hoje
              </Button>
            )}
          </div>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setWeekOffset(prev => prev + 1)}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-2 mb-8">
          {DAYS_OF_WEEK.map((day, index) => {
            const date = weekDates[index]
            const isSelected = selectedDay === index
            const isTodayDate = isToday(date)
            const animeCount = scheduleByDay[index]?.length || 0

            return (
              <button
                key={day.key}
                onClick={() => setSelectedDay(index)}
                className={`
                  relative p-3 rounded-lg text-center transition-all
                  ${isSelected 
                    ? "bg-primary text-primary-foreground" 
                    : "glass-card border border-border hover:border-primary/50"
                  }
                `}
              >
                <span className="text-xs font-medium block">
                  <span className="hidden sm:inline">{day.label}</span>
                  <span className="sm:hidden">{day.short}</span>
                </span>
                <span className={`text-lg font-bold block ${isSelected ? "" : "text-foreground"}`}>
                  {date.getDate()}
                </span>
                {isTodayDate && !isSelected && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                )}
                {animeCount > 0 && (
                  <span className={`text-xs ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {animeCount} anime{animeCount !== 1 ? "s" : ""}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected Day Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {DAYS_OF_WEEK[selectedDay].label}, {formatDate(weekDates[selectedDay])}
            </h2>
            <p className="text-sm text-muted-foreground">
              {todayAnimes.length} anime{todayAnimes.length !== 1 ? "s" : ""} programado{todayAnimes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Anime Schedule List */}
        {isLoading ? (
          <ScheduleSkeleton />
        ) : todayAnimes.length === 0 ? (
          <EmptySchedule day={DAYS_OF_WEEK[selectedDay].label} />
        ) : (
          <div className="space-y-3">
            {todayAnimes.map((anime, index) => (
              <ScheduleCard 
                key={anime.id} 
                anime={anime}
                time={getSimulatedTime(index)}
                isNotified={notifications.has(anime.id)}
                onToggleNotification={() => toggleNotification(anime.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Simulate broadcast times
function getSimulatedTime(index: number): string {
  const hours = [10, 12, 14, 16, 18, 20, 22, 23]
  const hour = hours[index % hours.length]
  const minutes = (index * 15) % 60
  return `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

interface ScheduleCardProps {
  anime: AnimeData
  time: string
  isNotified: boolean
  onToggleNotification: () => void
}

function ScheduleCard({ anime, time, isNotified, onToggleNotification }: ScheduleCardProps) {
  return (
    <div className="glass-card rounded-lg border border-border hover:border-primary/30 transition-all overflow-hidden">
      <div className="flex items-stretch">
        {/* Time Column */}
        <div className="w-20 flex-shrink-0 bg-secondary/30 flex flex-col items-center justify-center p-3 border-r border-border">
          <Clock className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-lg font-bold text-foreground">{time}</span>
          <span className="text-xs text-muted-foreground">BRT</span>
        </div>

        {/* Anime Info */}
        <div className="flex-1 flex items-center gap-4 p-3">
          <div className="w-16 h-20 relative rounded overflow-hidden flex-shrink-0">
            <Image
              src={anime.image}
              alt={anime.title}
              fill
              className="object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{anime.title}</h3>
            <p className="text-sm text-muted-foreground">
              Episódio {anime.episodes || "??"} • {anime.studio || "Desconhecido"}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {anime.score > 0 && (
                <span className="text-xs text-muted-foreground flex items-center">
                  <Star className="w-3 h-3 mr-1 text-yellow-400 fill-yellow-400" />
                  {anime.score.toFixed(1)}
                </span>
              )}
              {anime.genres && anime.genres.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {anime.genres.slice(0, 2).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-3 border-l border-border">
          <Button
            variant={isNotified ? "default" : "outline"}
            size="icon"
            onClick={onToggleNotification}
            className={isNotified ? "bg-primary text-primary-foreground" : ""}
          >
            {isNotified ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </Button>
          <Button size="icon" className="bg-primary text-primary-foreground">
            <Play className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="glass-card rounded-lg border border-border overflow-hidden animate-pulse">
          <div className="flex items-stretch">
            <div className="w-20 bg-secondary/30 p-6" />
            <div className="flex-1 flex items-center gap-4 p-3">
              <div className="w-16 h-20 bg-secondary/50 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary/50 rounded w-3/4" />
                <div className="h-3 bg-secondary/50 rounded w-1/2" />
                <div className="h-3 bg-secondary/50 rounded w-1/3" />
              </div>
            </div>
            <div className="flex items-center gap-2 p-3">
              <div className="w-10 h-10 bg-secondary/50 rounded" />
              <div className="w-10 h-10 bg-secondary/50 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptySchedule({ day }: { day: string }) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">Nenhum anime programado</h3>
      <p className="text-muted-foreground">
        Não há lançamentos previstos para {day}.
      </p>
    </div>
  )
}
