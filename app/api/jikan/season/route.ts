import { NextResponse } from "next/server"
import { fetchSeasonAnime, fetchAiringAnime, getCurrentSeason, translateSeason } from "@/lib/jikan-api"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined
  const season = searchParams.get("season") as "winter" | "spring" | "summer" | "fall" | undefined
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 25
  
  try {
    let animes
    let seasonInfo
    
    if (year && season) {
      animes = await fetchSeasonAnime(year, season, limit)
      seasonInfo = { year, season, seasonPt: translateSeason(season) }
    } else {
      // Get current season
      animes = await fetchAiringAnime(limit)
      const current = getCurrentSeason()
      seasonInfo = { 
        year: current.year, 
        season: current.season, 
        seasonPt: translateSeason(current.season) 
      }
    }
    
    return NextResponse.json({ 
      animes, 
      season: seasonInfo,
      count: animes.length 
    })
  } catch (error) {
    console.error("[API] Jikan season error:", error)
    return NextResponse.json({ error: "Failed to fetch seasonal anime", animes: [] }, { status: 500 })
  }
}
