import { NextResponse } from "next/server"
import { getAnimeInfo, getEpisodes } from "@/lib/hianime/scraper"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ animeId: string }> }
) {
  const { animeId } = await params

  if (!animeId) {
    return NextResponse.json(
      { success: false, error: "Anime ID is required" },
      { status: 400 }
    )
  }

  try {
    console.log("[v0] HiAnime info:", animeId)
    
    // Fetch info and episodes in parallel
    const [info, episodes] = await Promise.all([
      getAnimeInfo(animeId),
      getEpisodes(animeId)
    ])
    
    if (!info) {
      return NextResponse.json(
        { success: false, error: "Anime not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        anime: info,
        episodes: episodes.map(ep => ({
          number: ep.number,
          title: ep.title,
          episodeId: ep.episodeId,
          isFiller: ep.isFiller,
        }))
      }
    })
  } catch (error) {
    console.error("[v0] HiAnime info error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch anime info" },
      { status: 500 }
    )
  }
}
