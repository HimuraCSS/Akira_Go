import { NextRequest, NextResponse } from "next/server"
import { ShokoClient, transformShokoSeries, transformShokoEpisode } from "@/lib/shoko-api"

export const dynamic = "force-dynamic"

function getClientFromRequest(request: NextRequest): ShokoClient | null {
  const baseUrl = request.headers.get("x-shoko-url") || process.env.NEXT_PUBLIC_SHOKO_URL
  const apiKey = request.headers.get("x-shoko-apikey") || process.env.SHOKO_API_KEY

  if (!baseUrl || !apiKey) {
    return null
  }

  return new ShokoClient({ baseUrl, apiKey })
}

/**
 * GET /api/shoko/series/[seriesId]
 * Get series details with episodes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params
    const client = getClientFromRequest(request)
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Shoko nao configurado" },
        { status: 400 }
      )
    }

    // Parse series ID (remove "shoko-" prefix if present)
    const id = seriesId.startsWith("shoko-") 
      ? parseInt(seriesId.replace("shoko-", ""))
      : parseInt(seriesId)

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      )
    }

    // Get series and episodes in parallel
    const [series, episodes] = await Promise.all([
      client.getSeries(id),
      client.getEpisodes(id),
    ])

    return NextResponse.json({
      success: true,
      data: {
        series: transformShokoSeries(series, client),
        episodes: episodes
          .filter(ep => ep.Type === "Normal") // Only regular episodes
          .map(ep => transformShokoEpisode(ep, series, client)),
        specials: episodes
          .filter(ep => ep.Type === "Special")
          .map(ep => transformShokoEpisode(ep, series, client)),
        backdrop: client.getBackdropUrl(series),
      },
    })
  } catch (error) {
    console.error("[Shoko] Series detail error:", error)
    return NextResponse.json(
      { success: false, error: "Falha ao buscar serie" },
      { status: 500 }
    )
  }
}
