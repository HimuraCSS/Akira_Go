import { NextRequest, NextResponse } from "next/server"
import { ShokoClient } from "@/lib/shoko-api"

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
 * GET /api/shoko/stream/[episodeId]
 * Get stream info for an episode
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const { episodeId } = await params
    const client = getClientFromRequest(request)
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Shoko nao configurado" },
        { status: 400 }
      )
    }

    // Parse episode ID (remove "shoko-ep-" prefix if present)
    const id = episodeId.startsWith("shoko-ep-") 
      ? parseInt(episodeId.replace("shoko-ep-", ""))
      : parseInt(episodeId)

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      )
    }

    // Get episode files
    const files = await client.getEpisodeFiles(id)
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum arquivo encontrado para este episodio" },
        { status: 404 }
      )
    }

    // Get the best file (prefer highest quality)
    const file = files[0]
    const streamInfo = await client.getFileStreamInfo(file.ID)

    if (!streamInfo) {
      return NextResponse.json(
        { success: false, error: "Falha ao obter informacoes do stream" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        sources: [{
          url: streamInfo.url,
          quality: file.MediaInfo?.Video?.Resolution || "HD",
          isM3U8: false,
          type: "mp4",
        }],
        subtitles: streamInfo.subtitles.map(sub => ({
          url: sub.url,
          lang: sub.language,
          format: sub.format,
        })),
        duration: streamInfo.duration,
        fileInfo: {
          id: file.ID,
          codec: file.MediaInfo?.Video?.Codec,
          resolution: file.MediaInfo?.Video?.Resolution,
          width: file.MediaInfo?.Video?.Width,
          height: file.MediaInfo?.Video?.Height,
          size: file.Size,
        },
      },
    })
  } catch (error) {
    console.error("[Shoko] Stream error:", error)
    return NextResponse.json(
      { success: false, error: "Falha ao obter stream" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/shoko/stream/[episodeId]
 * Update watch progress
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const { episodeId } = await params
    const client = getClientFromRequest(request)
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Shoko nao configurado" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { action, position, fileId } = body

    const id = episodeId.startsWith("shoko-ep-") 
      ? parseInt(episodeId.replace("shoko-ep-", ""))
      : parseInt(episodeId)

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      )
    }

    if (action === "watched") {
      await client.markEpisodeWatched(id)
      return NextResponse.json({ success: true, message: "Marcado como assistido" })
    }

    if (action === "unwatched") {
      await client.markEpisodeUnwatched(id)
      return NextResponse.json({ success: true, message: "Marcado como nao assistido" })
    }

    if (action === "progress" && position !== undefined && fileId) {
      await client.updateResumePosition(fileId, Math.floor(position))
      return NextResponse.json({ success: true, message: "Progresso atualizado" })
    }

    return NextResponse.json(
      { success: false, error: "Acao invalida" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Shoko] Update error:", error)
    return NextResponse.json(
      { success: false, error: "Falha ao atualizar" },
      { status: 500 }
    )
  }
}
