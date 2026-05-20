import { NextResponse } from "next/server"

const JIKAN_BASE = "https://api.jikan.moe/v4"

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")
  const type = searchParams.get("type") || "anime" // anime or manga
  const status = searchParams.get("status") || "all" // watching, completed, on_hold, dropped, plan_to_watch, all

  if (!username) {
    return NextResponse.json({ error: "Username é obrigatório" }, { status: 400 })
  }

  try {
    // Get user profile
    const profileResponse = await fetch(`${JIKAN_BASE}/users/${username}`)
    
    if (!profileResponse.ok) {
      if (profileResponse.status === 404) {
        return NextResponse.json({ error: "Usuário não encontrado no MAL" }, { status: 404 })
      }
      throw new Error("Erro ao buscar perfil")
    }
    
    const profileData = await profileResponse.json()
    const profile = profileData.data

    await delay(350) // Respect Jikan rate limit

    // Get user's anime/manga list
    const statusParam = status !== "all" ? `&status=${status}` : ""
    const listResponse = await fetch(
      `${JIKAN_BASE}/users/${username}/${type}list?limit=300${statusParam}`
    )
    
    if (!listResponse.ok) {
      throw new Error("Erro ao buscar lista")
    }
    
    const listData = await listResponse.json()

    // Transform data to our format
    const items = listData.data?.map((item: any) => ({
      malId: item.node?.id || item.entry?.mal_id,
      title: item.node?.title || item.entry?.title,
      titleEnglish: item.entry?.title_english,
      image: item.node?.main_picture?.large || item.entry?.images?.jpg?.large_image_url || item.entry?.images?.jpg?.image_url,
      score: item.list_status?.score || item.score,
      status: item.list_status?.status || item.watching_status || item.reading_status,
      progress: item.list_status?.num_episodes_watched || item.episodes_watched || item.chapters_read || 0,
      totalEpisodes: item.node?.num_episodes || item.entry?.episodes || item.entry?.chapters || 0,
      type: item.entry?.type,
      year: item.entry?.year,
      season: item.entry?.season,
      airing: item.entry?.airing || item.entry?.publishing,
      genres: item.entry?.genres?.map((g: any) => g.name) || [],
    })) || []

    return NextResponse.json({
      success: true,
      profile: {
        username: profile.username,
        avatar: profile.images?.jpg?.image_url,
        joined: profile.joined,
        statistics: profile.statistics,
      },
      items,
      total: listData.pagination?.last_visible_page ? listData.pagination.last_visible_page * 300 : items.length,
    })
  } catch (error) {
    console.error("MAL API Error:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados do MyAnimeList" },
      { status: 500 }
    )
  }
}
