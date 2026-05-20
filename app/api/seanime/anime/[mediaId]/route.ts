import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params
    const url = request.nextUrl.searchParams.get("url")
    const token = request.nextUrl.searchParams.get("token")

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const baseUrl = url.replace(/\/$/, "")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(`${baseUrl}/api/v1/library/anime-entry/${mediaId}`, {
      headers,
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Seanime API error: ${response.status}` },
        { status: response.status }
      )
    }

    const entry = await response.json()

    // Transform episodes
    const episodes = entry.episodes?.map((ep: any) => ({
      id: `${mediaId}-ep-${ep.episodeNumber}`,
      number: ep.episodeNumber,
      title: ep.displayTitle || ep.episodeTitle || `Episode ${ep.episodeNumber}`,
      thumbnail: ep.episodeMetadata?.image || null,
      description: ep.episodeMetadata?.summary || ep.episodeMetadata?.overview || null,
      airDate: ep.episodeMetadata?.airDate || null,
      duration: ep.episodeMetadata?.length ? `${ep.episodeMetadata.length}:00` : "24:00",
      isDownloaded: ep.isDownloaded || false,
      localFilePath: ep.localFile?.path || null,
      isWatched: entry.listData ? ep.episodeNumber <= (entry.listData.progress || 0) : false,
    })) || []

    return NextResponse.json({
      id: entry.mediaId,
      title: entry.media?.title?.userPreferred || entry.media?.title?.romaji || "Unknown",
      titleRomaji: entry.media?.title?.romaji,
      titleEnglish: entry.media?.title?.english,
      image: entry.media?.coverImage?.extraLarge || entry.media?.coverImage?.large,
      banner: entry.media?.bannerImage,
      description: entry.media?.description,
      status: entry.media?.status,
      format: entry.media?.format,
      episodes: entry.media?.episodes,
      meanScore: entry.media?.meanScore,
      year: entry.media?.startDate?.year,
      season: entry.media?.season,
      progress: entry.listData?.progress || 0,
      userScore: entry.listData?.score || 0,
      userStatus: entry.listData?.status,
      nextEpisode: entry.nextEpisode?.episodeNumber || null,
      episodeList: episodes,
      localFilesCount: entry.localFiles?.length || 0,
      trailer: entry.media?.trailer ? {
        id: entry.media.trailer.id,
        site: entry.media.trailer.site,
        thumbnail: entry.media.trailer.thumbnail,
      } : null,
    })
  } catch (error) {
    console.error("Seanime anime entry error:", error)
    return NextResponse.json(
      { error: "Failed to fetch anime entry" },
      { status: 500 }
    )
  }
}
