import { NextResponse } from "next/server"
import { getEpisodeServers } from "@/lib/hianime/scraper"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params

  if (!episodeId) {
    return NextResponse.json(
      { success: false, error: "Episode ID is required" },
      { status: 400 }
    )
  }

  try {
    console.log("[v0] HiAnime servers:", episodeId)
    const servers = await getEpisodeServers(episodeId)
    
    return NextResponse.json({
      success: true,
      data: {
        episodeId,
        servers
      }
    })
  } catch (error) {
    console.error("[v0] HiAnime servers error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch servers" },
      { status: 500 }
    )
  }
}
