import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
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

    const response = await fetch(`${baseUrl}/api/v1/library/collection`, {
      headers,
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Seanime API error: ${response.status}` },
        { status: response.status }
      )
    }

    const collection = await response.json()

    // Transform to simplified format
    const continueWatching = collection.continueWatchingList?.map((entry: any) => ({
      id: entry.mediaId,
      title: entry.media?.title?.userPreferred || entry.media?.title?.romaji || "Unknown",
      image: entry.media?.coverImage?.extraLarge || entry.media?.coverImage?.large,
      progress: entry.listData?.progress || 0,
      totalEpisodes: entry.media?.episodes || 0,
      nextEpisode: entry.nextEpisode?.episodeNumber || null,
      status: entry.listData?.status || "CURRENT",
    })) || []

    const allEntries = collection.lists?.flatMap((list: any) => 
      list.entries?.map((entry: any) => ({
        id: entry.mediaId,
        title: entry.media?.title?.userPreferred || entry.media?.title?.romaji || "Unknown",
        image: entry.media?.coverImage?.extraLarge || entry.media?.coverImage?.large,
        progress: entry.listData?.progress || 0,
        totalEpisodes: entry.media?.episodes || 0,
        score: entry.listData?.score || 0,
        status: entry.listData?.status || list.status,
        hasLocalFiles: (entry.localFiles?.length || 0) > 0,
      })) || []
    ) || []

    return NextResponse.json({
      continueWatching,
      entries: allEntries,
      unmatchedCount: collection.unmatchedLocalFiles?.length || 0,
    })
  } catch (error) {
    console.error("Seanime library error:", error)
    return NextResponse.json(
      { error: "Failed to fetch library" },
      { status: 500 }
    )
  }
}
