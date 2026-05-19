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
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Estatísticas de Visualização
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hours Watched */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas Assistidas</p>
              <p className="text-2xl font-bold text-foreground">{stats.hoursWatched}h</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-green-500">+12h</p>
            <p className="text-xs text-muted-foreground">esta semana</p>
          </div>
        </div>

        {/* Episodes Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Episódios Pendentes</span>
            <span className="text-foreground font-medium">{stats.episodesLeft}</span>
          </div>
          <Progress value={75} className="h-2 bg-secondary" />
          <p className="text-xs text-muted-foreground">75% da sua watchlist concluída</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Play className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground">Sequência</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stats.currentStreak} dias</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-xs text-muted-foreground">Concluídos</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stats.completedThisMonth}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
