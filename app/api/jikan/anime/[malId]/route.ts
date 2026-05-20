import { NextResponse } from "next/server"
import { 
  fetchAnimeById, 
  fetchAnimeEpisodes, 
  fetchAnimeCharacters, 
  fetchAnimeRelations,
  fetchAnimeRecommendations 
} from "@/lib/jikan-api"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ malId: string }> }
) {
  const { malId } = await params
  const { searchParams } = new URL(request.url)
  const include = searchParams.get("include")?.split(",") || []
  
  try {
    // Always fetch basic anime info
    const anime = await fetchAnimeById(malId)
    
    if (!anime) {
      return NextResponse.json({ error: "Anime not found" }, { status: 404 })
    }
    
    const result: Record<string, unknown> = { anime }
    
    // Fetch additional data if requested
    if (include.includes("episodes")) {
      const page = searchParams.get("episodes_page") ? parseInt(searchParams.get("episodes_page")!) : 1
      result.episodes = await fetchAnimeEpisodes(malId, page)
    }
    
    if (include.includes("characters")) {
      result.characters = await fetchAnimeCharacters(malId)
    }
    
    if (include.includes("relations")) {
      result.relations = await fetchAnimeRelations(malId)
    }
    
    if (include.includes("recommendations")) {
      const recLimit = searchParams.get("rec_limit") ? parseInt(searchParams.get("rec_limit")!) : 10
      result.recommendations = await fetchAnimeRecommendations(malId, recLimit)
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Jikan anime info error:", error)
    return NextResponse.json({ error: "Failed to fetch anime" }, { status: 500 })
  }
}
