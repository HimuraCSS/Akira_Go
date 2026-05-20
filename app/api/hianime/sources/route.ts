import { NextResponse } from "next/server"
import { getStreamingSources, type ServerType } from "@/lib/hianime/scraper"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const episodeId = searchParams.get("episodeId") || searchParams.get("id")
  const serverId = searchParams.get("serverId") || searchParams.get("server")
  const serverType = (searchParams.get("type") || "sub") as ServerType

  if (!episodeId) {
    return NextResponse.json(
      { success: false, error: "Episode ID is required" },
      { status: 400 }
    )
  }
  
  if (!serverId) {
    return NextResponse.json(
      { success: false, error: "Server ID is required" },
      { status: 400 }
    )
  }

  try {
    console.log("[v0] HiAnime stream:", episodeId, "server:", serverId, "type:", serverType)
    
    const streamInfo = await getStreamingSources(
      episodeId, 
      parseInt(serverId),
      serverType
    )
    
    if (!streamInfo || streamInfo.sources.length === 0) {
      return NextResponse.json(
        { success: false, error: "No streaming sources found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        sources: streamInfo.sources,
        subtitles: streamInfo.subtitles,
        intro: streamInfo.intro,
        outro: streamInfo.outro,
        server: streamInfo.server,
        headers: streamInfo.headers,
      }
    })
  } catch (error) {
    console.error("[v0] HiAnime stream error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch streaming sources" },
      { status: 500 }
    )
  }
}
