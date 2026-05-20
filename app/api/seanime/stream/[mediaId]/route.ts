import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params
    const url = request.nextUrl.searchParams.get("url")
    const token = request.nextUrl.searchParams.get("token")
    const episode = request.nextUrl.searchParams.get("episode")
    const source = request.nextUrl.searchParams.get("source") || "local" // local | online

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    if (!episode) {
      return NextResponse.json({ error: "Episode number is required" }, { status: 400 })
    }

    const baseUrl = url.replace(/\/$/, "")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    // If using online streaming
    if (source === "online") {
      const sourceResponse = await fetch(
        `${baseUrl}/api/v1/onlinestream/episode-source?mediaId=${mediaId}&episodeNumber=${episode}&dubbed=false`,
        { headers }
      )

      if (!sourceResponse.ok) {
        return NextResponse.json(
          { error: "Failed to get online stream source" },
          { status: sourceResponse.status }
        )
      }

      const sourceData = await sourceResponse.json()

      return NextResponse.json({
        type: "hls",
        url: sourceData.url,
        quality: sourceData.quality || "auto",
        subtitles: sourceData.subtitles?.map((sub: any) => ({
          url: sub.url,
          language: sub.language,
          label: sub.language,
        })) || [],
        headers: sourceData.headers || {},
      })
    }

    // For local files, first get the anime entry to find the file path
    const entryResponse = await fetch(`${baseUrl}/api/v1/library/anime-entry/${mediaId}`, {
      headers,
    })

    if (!entryResponse.ok) {
      return NextResponse.json(
        { error: "Failed to get anime entry" },
        { status: entryResponse.status }
      )
    }

    const entry = await entryResponse.json()
    
    // Find the episode
    const episodeData = entry.episodes?.find(
      (ep: any) => ep.episodeNumber === parseInt(episode)
    )

    if (!episodeData?.localFile?.path) {
      // No local file, try online streaming
      const sourceResponse = await fetch(
        `${baseUrl}/api/v1/onlinestream/episode-source?mediaId=${mediaId}&episodeNumber=${episode}&dubbed=false`,
        { headers }
      )

      if (sourceResponse.ok) {
        const sourceData = await sourceResponse.json()
        return NextResponse.json({
          type: "hls",
          url: sourceData.url,
          quality: sourceData.quality || "auto",
          subtitles: sourceData.subtitles?.map((sub: any) => ({
            url: sub.url,
            language: sub.language,
            label: sub.language,
          })) || [],
          headers: sourceData.headers || {},
        })
      }

      return NextResponse.json(
        { error: "No local file or online source available" },
        { status: 404 }
      )
    }

    // Return direct stream URL for local file
    const filePath = episodeData.localFile.path
    const encodedPath = encodeURIComponent(filePath)
    
    return NextResponse.json({
      type: "direct",
      url: `${baseUrl}/api/v1/directstream/stream/${encodedPath}`,
      quality: "source",
      subtitles: [],
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      localFile: {
        path: filePath,
        name: episodeData.localFile.name,
      },
    })
  } catch (error) {
    console.error("Seanime stream error:", error)
    return NextResponse.json(
      { error: "Failed to get stream" },
      { status: 500 }
    )
  }
}

// POST to update progress
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params
    const { url, token, progress } = await request.json()

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

    const response = await fetch(`${baseUrl}/api/v1/anime-entry/update-progress`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        mediaId: parseInt(mediaId),
        progress: progress,
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to update progress" },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Seanime progress update error:", error)
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    )
  }
}
