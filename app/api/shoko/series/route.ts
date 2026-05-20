import { NextRequest, NextResponse } from "next/server"
import { ShokoClient, transformShokoSeries } from "@/lib/shoko-api"

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
 * GET /api/shoko/series
 * List all series or search
 */
export async function GET(request: NextRequest) {
  try {
    const client = getClientFromRequest(request)
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Shoko nao configurado" },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")

    if (query) {
      // Search mode
      const series = await client.searchSeries(query, pageSize)
      return NextResponse.json({
        success: true,
        data: series.map(s => transformShokoSeries(s, client)),
        total: series.length,
      })
    }

    // List mode
    const { series, total } = await client.getAllSeries(page, pageSize)
    
    return NextResponse.json({
      success: true,
      data: series.map(s => transformShokoSeries(s, client)),
      total,
      page,
      pageSize,
    })
  } catch (error) {
    console.error("[Shoko] Series list error:", error)
    return NextResponse.json(
      { success: false, error: "Falha ao buscar series" },
      { status: 500 }
    )
  }
}
