import { NextResponse } from "next/server"
import { searchAnime } from "@/lib/hianime/scraper"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || searchParams.get("keyword")
  const page = parseInt(searchParams.get("page") || "1")

  if (!query) {
    return NextResponse.json(
      { success: false, error: "Query parameter 'q' is required" },
      { status: 400 }
    )
  }

  try {
    console.log("[v0] HiAnime search:", query, "page:", page)
    const result = await searchAnime(query, page)
    
    return NextResponse.json({
      success: true,
      data: {
        animes: result.results,
        totalPages: result.totalPages,
        currentPage: page,
        hasNextPage: result.hasNextPage,
      }
    })
  } catch (error) {
    console.error("[v0] HiAnime search error:", error)
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 }
    )
  }
}
