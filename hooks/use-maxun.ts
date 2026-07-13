"use client"

import useSWR from "swr"
import type { AnimeData } from "@/components/anitracker/anime-card"
import { runRobot, type RobotResponse } from "@/lib/maxun-api"

const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000,
  errorRetryCount: 1,
}

/**
 * Runs a named scraping robot and returns app-ready anime data.
 * Pass `query` only for the "search" robot.
 */
export function useRobot(robotId: string | null, opts: { page?: number; query?: string } = {}) {
  const key = robotId ? ["maxun", robotId, opts.page || 1, opts.query || ""] : null

  const { data, error, isLoading, mutate } = useSWR<RobotResponse>(
    key,
    () => runRobot(robotId as string, opts),
    swrConfig,
  )

  return {
    animes: (data?.data as AnimeData[]) || [],
    source: data?.robot?.source,
    pagination: data?.pagination,
    meta: data?.meta,
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}
