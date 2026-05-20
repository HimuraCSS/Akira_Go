import { NextResponse } from "next/server"

export const runtime = "edge"

interface SubtitleSource {
  url: string
  lang: string
  label: string
  provider: string
}

interface SubtitleResponse {
  success: boolean
  subtitles: SubtitleSource[]
  error?: string
}

// AniWatch/Zoro API - Best source for anime subtitles
async function fetchAniWatchSubtitles(title: string, episode: number): Promise<SubtitleSource[]> {
  try {
    // Search for anime on AniWatch
    const searchUrl = `https://api.consumet.org/anime/zoro/${encodeURIComponent(title)}`
    const searchRes = await fetch(searchUrl, { 
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000)
    })
    
    if (!searchRes.ok) return []
    
    const searchData = await searchRes.json()
    if (!searchData.results?.length) return []
    
    const animeId = searchData.results[0].id
    
    // Get episodes
    const episodesUrl = `https://api.consumet.org/anime/zoro/info?id=${animeId}`
    const episodesRes = await fetch(episodesUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000)
    })
    
    if (!episodesRes.ok) return []
    
    const episodesData = await episodesRes.json()
    const episodeData = episodesData.episodes?.find((ep: { number: number }) => ep.number === episode)
    
    if (!episodeData) return []
    
    // Get streaming sources with subtitles
    const watchUrl = `https://api.consumet.org/anime/zoro/watch?episodeId=${episodeData.id}`
    const watchRes = await fetch(watchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000)
    })
    
    if (!watchRes.ok) return []
    
    const watchData = await watchRes.json()
    
    if (!watchData.subtitles?.length) return []
    
    return watchData.subtitles
      .filter((sub: { lang: string }) => 
        sub.lang?.toLowerCase().includes("portuguese") || 
        sub.lang?.toLowerCase().includes("portugues") ||
        sub.lang?.toLowerCase().includes("pt-br") ||
        sub.lang?.toLowerCase().includes("brazilian")
      )
      .map((sub: { url: string; lang: string }) => ({
        url: sub.url,
        lang: "pt-BR",
        label: "Português (AniWatch)",
        provider: "AniWatch"
      }))
  } catch {
    return []
  }
}

// OpenSubtitles API - Largest subtitle database
async function fetchOpenSubtitles(title: string, episode: number, malId?: number): Promise<SubtitleSource[]> {
  try {
    // OpenSubtitles requires API key for full access, but we can try the public endpoint
    const query = encodeURIComponent(title)
    const url = `https://rest.opensubtitles.org/search/query-${query}/episode-${episode}/sublanguageid-pob`
    
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AKIRA Go v1.0",
        "X-User-Agent": "AKIRA Go v1.0"
      },
      signal: AbortSignal.timeout(8000)
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    
    if (!Array.isArray(data) || !data.length) return []
    
    // Return top 3 results sorted by downloads
    return data
      .sort((a: { SubDownloadsCnt: string }, b: { SubDownloadsCnt: string }) => 
        parseInt(b.SubDownloadsCnt) - parseInt(a.SubDownloadsCnt)
      )
      .slice(0, 3)
      .map((sub: { SubDownloadLink: string; LanguageName: string; SubFileName: string }) => ({
        url: sub.SubDownloadLink?.replace(".gz", "") || "",
        lang: "pt-BR",
        label: `Português (${sub.SubFileName?.substring(0, 30) || "OpenSub"})`,
        provider: "OpenSubtitles"
      }))
      .filter((sub: SubtitleSource) => sub.url)
  } catch {
    return []
  }
}

// Subdl API - Free subtitle API
async function fetchSubdl(title: string, episode: number): Promise<SubtitleSource[]> {
  try {
    const url = `https://api.subdl.com/api/v1/subtitles?film_name=${encodeURIComponent(title)}&episode_number=${episode}&languages=pt`
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000)
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    
    if (!data.subtitles?.length) return []
    
    return data.subtitles
      .slice(0, 3)
      .map((sub: { url: string; release_name: string }) => ({
        url: sub.url,
        lang: "pt-BR",
        label: `Português (${sub.release_name?.substring(0, 20) || "Subdl"})`,
        provider: "Subdl"
      }))
  } catch {
    return []
  }
}

// Jimaku API - Anime-focused subtitles
async function fetchJimaku(title: string, episode: number, malId?: number): Promise<SubtitleSource[]> {
  try {
    // Jimaku uses AniList/MAL IDs
    let searchUrl = `https://jimaku.cc/api/entries/search?query=${encodeURIComponent(title)}`
    
    if (malId) {
      searchUrl = `https://jimaku.cc/api/entries/search?mal_id=${malId}`
    }
    
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000)
    })
    
    if (!searchRes.ok) return []
    
    const entries = await searchRes.json()
    
    if (!Array.isArray(entries) || !entries.length) return []
    
    const entryId = entries[0].id
    
    // Get files for this entry
    const filesUrl = `https://jimaku.cc/api/entries/${entryId}/files?episode=${episode}`
    const filesRes = await fetch(filesUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000)
    })
    
    if (!filesRes.ok) return []
    
    const files = await filesRes.json()
    
    if (!Array.isArray(files) || !files.length) return []
    
    // Filter Portuguese subtitles
    return files
      .filter((file: { name: string }) => 
        file.name?.toLowerCase().includes("pt") ||
        file.name?.toLowerCase().includes("portuguese") ||
        file.name?.toLowerCase().includes("brasil")
      )
      .slice(0, 3)
      .map((file: { url: string; name: string }) => ({
        url: file.url,
        lang: "pt-BR",
        label: `Português (${file.name?.substring(0, 20) || "Jimaku"})`,
        provider: "Jimaku"
      }))
  } catch {
    return []
  }
}

// Animetosho - Anime torrent/subtitle database
async function fetchAnimetosho(title: string, episode: number): Promise<SubtitleSource[]> {
  try {
    const query = encodeURIComponent(`${title} ${episode}`)
    const url = `https://animetosho.org/api?q=${query}&qx=1&filter[0][t]=nyaa_class&filter[0][v]=trusted`
    
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000)
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    
    if (!Array.isArray(data) || !data.length) return []
    
    // Get subtitles from the first result
    const entry = data[0]
    
    if (!entry.subtitles?.length) return []
    
    return entry.subtitles
      .filter((sub: { language: string }) => 
        sub.language?.toLowerCase().includes("portuguese") ||
        sub.language?.toLowerCase() === "pt"
      )
      .slice(0, 2)
      .map((sub: { url: string; name: string }) => ({
        url: sub.url,
        lang: "pt-BR",
        label: `Português (${sub.name?.substring(0, 20) || "Animetosho"})`,
        provider: "Animetosho"
      }))
  } catch {
    return []
  }
}

export async function GET(request: Request): Promise<NextResponse<SubtitleResponse>> {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get("title")
  const episodeStr = searchParams.get("episode") || "1"
  const episode = parseInt(episodeStr)
  const malIdStr = searchParams.get("malId")
  const malId = malIdStr ? parseInt(malIdStr) : undefined

  if (!title) {
    return NextResponse.json({
      success: false,
      subtitles: [],
      error: "Title is required"
    })
  }

  // Fetch subtitles from all sources in parallel
  const [aniwatch, openSubs, subdl, jimaku, animetosho] = await Promise.all([
    fetchAniWatchSubtitles(title, episode),
    fetchOpenSubtitles(title, episode, malId),
    fetchSubdl(title, episode),
    fetchJimaku(title, episode, malId),
    fetchAnimetosho(title, episode),
  ])

  // Combine all subtitles, prioritizing AniWatch (most reliable for anime)
  const allSubtitles = [
    ...aniwatch,
    ...jimaku,
    ...openSubs,
    ...subdl,
    ...animetosho,
  ]

  // Remove duplicates by URL
  const uniqueSubtitles = allSubtitles.filter((sub, index, self) =>
    index === self.findIndex(s => s.url === sub.url)
  )

  return NextResponse.json({
    success: uniqueSubtitles.length > 0,
    subtitles: uniqueSubtitles,
  })
}
