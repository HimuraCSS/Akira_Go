import { NextResponse } from "next/server"
import { searchAnimeAdvanced } from "@/lib/jikan-api"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  const q = searchParams.get("q") || undefined
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 25
  const type = searchParams.get("type") as "tv" | "movie" | "ova" | "special" | "ona" | "music" | undefined
  const status = searchParams.get("status") as "airing" | "complete" | "upcoming" | undefined
  const genres = searchParams.get("genres") ? searchParams.get("genres")!.split(",").map(Number) : undefined
  const order_by = searchParams.get("order_by") as "score" | "popularity" | "title" | "start_date" | undefined
  const sort = searchParams.get("sort") as "asc" | "desc" | undefined
  const min_score = searchParams.get("min_score") ? parseFloat(searchParams.get("min_score")!) : undefined
  
  try {
    const result = await searchAnimeAdvanced({
      q,
      page,
      limit,
      type,
      status,
      genres,
      order_by,
      sort,
      min_score,
      sfw: true,
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Jikan search error:", error)
    return NextResponse.json(
      { error: "Failed to search anime", data: [], pagination: { has_next_page: false, last_visible_page: 1 } },
      { status: 500 }
    )
  }
}
