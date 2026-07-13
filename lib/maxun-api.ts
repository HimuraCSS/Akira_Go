"use client"

// Client helper for the Maxun-style scraping robots exposed at /api/maxun.

import type { AnimeData } from "@/components/anitracker/anime-card"

export interface RobotSummary {
  id: string
  name: string
  description: string
  source: string
}

export interface RobotResponse {
  success: boolean
  robot?: { id: string; name: string; source: string }
  data: AnimeData[]
  pagination?: { page: number; totalPages: number; hasNextPage: boolean }
  meta?: { source: string; url: string; durationMs: number; emptyFields: string[] }
  error?: string
}

export async function fetchRobots(): Promise<RobotSummary[]> {
  try {
    const res = await fetch("/api/maxun")
    if (!res.ok) return []
    const data = await res.json()
    return data.robots || []
  } catch {
    return []
  }
}

export async function runRobot(
  robotId: string,
  opts: { page?: number; query?: string } = {},
): Promise<RobotResponse> {
  const params = new URLSearchParams()
  if (opts.page) params.set("page", String(opts.page))
  if (opts.query) params.set("q", opts.query)

  const res = await fetch(`/api/maxun/${robotId}?${params.toString()}`)
  const data = (await res.json()) as RobotResponse
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Falha ao executar o robô")
  }
  return data
}
