import { NextResponse } from "next/server"
import { 
  searchAnime, 
  getEpisodeStreams, 
  searchByMalId,
  type AllMangaStream,
  type AllMangaShow,
} from "@/lib/allmanga-api"

export const runtime = "edge"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  const title = searchParams.get("title")
  const malId = searchParams.get("malId")
  const episode = parseInt(searchParams.get("episode") || "1")
  const translationType = (searchParams.get("type") || "sub") as "sub" | "dub"
  
  if (!title && !malId) {
    return NextResponse.json({
      success: false,
      error: "Missing required parameter: title or malId",
    }, { status: 400 })
  }
  
  try {
    // 1. Search for anime
    let anime: AllMangaShow | null = null
    
    if (title) {
      anime = await searchByMalId(malId ? parseInt(malId) : 0, title)
    }
    
    if (!anime) {
      return NextResponse.json({
        success: false,
        error: "Anime not found on AllManga",
        searchQuery: title,
      })
    }
    
    // 2. Get episode streams
    const streams = await getEpisodeStreams(anime._id, episode)
    
    // 3. Filter by translation type
    const filtered = streams.filter(s => s.translationType === translationType)
    const finalStreams = filtered.length > 0 ? filtered : streams
    
    // 4. Format response
    const sources = finalStreams.map((stream: AllMangaStream) => ({
      id: `allmanga-${stream.server}-${stream.translationType}-${stream.quality}`,
      name: `AllManga ${stream.quality}`,
      quality: stream.quality,
      url: stream.url,
      type: stream.type === "mp4" ? "mp4" : "hls",
      provider: "allmanga-cdn",
      headers: stream.headers,
      sizeMB: stream.sizeMB,
      durationSec: stream.durationSec,
      translationType: stream.translationType,
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        anime: {
          id: anime._id,
          title: anime.englishName || anime.name,
          nativeTitle: anime.nativeName,
          thumbnail: anime.thumbnail,
          episodeCount: anime.episodeCount,
          availableEpisodes: anime.availableEpisodes,
          score: anime.score,
          type: anime.type,
          status: anime.status,
          genres: anime.genres,
        },
        episode,
        translationType,
        sources,
        note: sources.length > 0 
          ? "Direct MP4 streams from AllAnime CDN. Pass Referer header when playing."
          : "No CDN streams available for this episode. Try a different episode or translation type.",
      },
    })
  } catch (error) {
    console.error("[AllManga API] Error:", error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}
