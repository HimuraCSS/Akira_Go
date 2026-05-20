import { NextResponse } from "next/server"
import { fetchTopAnime, fetchPopularAnime, fetchUpcomingAnime } from "@/lib/jikan-api"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filter = searchParams.get("filter") || "airing" // airing, popular, upcoming
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 25
  
  try {
    let animes
    
    switch (filter) {
      case "popular":
        animes = await fetchPopularAnime(limit)
        break
      case "upcoming":
        animes = await fetchUpcomingAnime(limit)
        break
      case "airing":
      default:
        animes = await fetchTopAnime(limit)
        break
    }
    
    return NextResponse.json({ 
      animes, 
      filter,
      count: animes.length 
    })
  } catch (error) {
    console.error("[API] Jikan top error:", error)
    return NextResponse.json({ error: "Failed to fetch top anime", animes: [] }, { status: 500 })
  }
}
