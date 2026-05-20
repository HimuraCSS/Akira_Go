"use client"

import { Clock, TrendingUp, CheckCircle, Play } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function StatsCard() {
  const stats = {
    hoursWatched: 127,
    episodesLeft: 48,
    currentStreak: 7,
    completedThisMonth: 3,
  }

  return (
    <Card className="glass-card glass-card-hover border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Estatisticas
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {/* Hours Watched - Compact */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Horas Assistidas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">{stats.hoursWatched}h</span>
            <span className="text-xs text-green-500">+12h</span>
          </div>
        </div>

        {/* Episodes Progress - Compact */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Pendentes: {stats.episodesLeft}</span>
            <span className="text-foreground">75%</span>
          </div>
          <Progress value={75} className="h-1.5 bg-secondary" />
        </div>

        {/* Quick Stats - Compact Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-md bg-secondary/50 border border-border">
            <div className="flex items-center justify-between">
              <Play className="w-3 h-3 text-primary" />
              <span className="text-sm font-bold text-foreground">{stats.currentStreak}d</span>
            </div>
            <span className="text-xs text-muted-foreground">Sequencia</span>
          </div>
          <div className="p-2 rounded-md bg-secondary/50 border border-border">
            <div className="flex items-center justify-between">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-sm font-bold text-foreground">{stats.completedThisMonth}</span>
            </div>
            <span className="text-xs text-muted-foreground">Completos</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
