/**
 * Anime Images API Service
 * Integrates AniList (primary) and Shikimori (fallback) APIs for high-quality banners
 */

// AniList GraphQL API
const ANILIST_API = "https://graphql.anilist.co"

// Shikimori API
const SHIKIMORI_API = "https://shikimori.one/api"

export interface AnimeImageData {
  bannerImage: string | null
  coverImage: {
    extraLarge: string | null
    large: string | null
  }
  title: {
    romaji: string
    english: string | null
    native: string | null
  }
  id: number
}

export interface ShikimoriAnime {
  id: number
  name: string
  image: {
    original: string
    preview: string
    x96: string
    x48: string
  }
}

/**
 * Search anime on AniList by title and get high-quality banner
 * AniList banners are typically 1720x390px or higher - perfect for hero sections
 */
export async function getAniListBanner(title: string): Promise<AnimeImageData | null> {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        bannerImage
        coverImage {
          extraLarge
          large
        }
        title {
          romaji
          english
          native
        }
      }
    }
  `

  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { search: title },
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.data?.Media || null
  } catch (error) {
    console.error("AniList API error:", error)
    return null
  }
}

/**
 * Get anime by AniList ID for exact matching
 */
export async function getAniListById(anilistId: number): Promise<AnimeImageData | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        bannerImage
        coverImage {
          extraLarge
          large
        }
        title {
          romaji
          english
          native
        }
      }
    }
  `

  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { id: anilistId },
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.data?.Media || null
  } catch (error) {
    console.error("AniList API error:", error)
    return null
  }
}

/**
 * Get multiple trending/popular anime with banners from AniList
 * Perfect for hero carousel
 */
export async function getAniListTrendingWithBanners(limit: number = 10): Promise<AnimeImageData[]> {
  const query = `
    query ($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, status: RELEASING) {
          id
          bannerImage
          coverImage {
            extraLarge
            large
          }
          title {
            romaji
            english
            native
          }
          description
          averageScore
          episodes
          status
          season
          seasonYear
          genres
          studios(isMain: true) {
            nodes {
              name
            }
          }
        }
      }
    }
  `

  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { perPage: limit },
      }),
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.data?.Page?.media || []
  } catch (error) {
    console.error("AniList API error:", error)
    return []
  }
}

/**
 * Get popular airing anime with banners from AniList
 */
export async function getAniListPopularAiring(limit: number = 10): Promise<any[]> {
  const query = `
    query ($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING) {
          id
          idMal
          bannerImage
          coverImage {
            extraLarge
            large
          }
          title {
            romaji
            english
            native
          }
          description(asHtml: false)
          averageScore
          episodes
          status
          season
          seasonYear
          genres
          duration
          studios(isMain: true) {
            nodes {
              name
            }
          }
        }
      }
    }
  `

  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { perPage: limit },
      }),
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.data?.Page?.media || []
  } catch (error) {
    console.error("AniList API error:", error)
    return []
  }
}

/**
 * Search anime on Shikimori by title
 * Shikimori provides original quality images without compression
 */
export async function getShikimoriBanner(title: string): Promise<ShikimoriAnime | null> {
  try {
    const response = await fetch(
      `${SHIKIMORI_API}/animes?search=${encodeURIComponent(title)}&limit=1`,
      {
        headers: {
          "User-Agent": "AkiraGo/1.0",
        },
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    if (data.length === 0) return null

    // Get full details with original image
    const animeId = data[0].id
    const detailResponse = await fetch(`${SHIKIMORI_API}/animes/${animeId}`, {
      headers: {
        "User-Agent": "AkiraGo/1.0",
      },
    })

    if (!detailResponse.ok) return null

    return await detailResponse.json()
  } catch (error) {
    console.error("Shikimori API error:", error)
    return null
  }
}

/**
 * Get Shikimori anime by MAL ID (for cross-reference)
 */
export async function getShikimoriByMalId(malId: number): Promise<ShikimoriAnime | null> {
  try {
    const response = await fetch(
      `${SHIKIMORI_API}/animes?myanimelist_id=${malId}`,
      {
        headers: {
          "User-Agent": "AkiraGo/1.0",
        },
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    if (data.length === 0) return null

    return data[0]
  } catch (error) {
    console.error("Shikimori API error:", error)
    return null
  }
}

/**
 * Get best quality banner using multiple APIs with fallback
 * Priority: AniList banner > Shikimori original > YouTube thumbnail > MAL image
 */
export async function getBestBannerImage(
  title: string,
  malId?: number,
  youtubeId?: string,
  fallbackImage?: string
): Promise<string> {
  // 1. Try AniList first (best quality banners)
  const anilistData = await getAniListBanner(title)
  if (anilistData?.bannerImage) {
    return anilistData.bannerImage
  }

  // 2. Try Shikimori as fallback (original quality images)
  if (malId) {
    const shikimoriData = await getShikimoriByMalId(malId)
    if (shikimoriData?.image?.original) {
      return `https://shikimori.one${shikimoriData.image.original}`
    }
  }

  // 3. Try YouTube thumbnail
  if (youtubeId) {
    const maxRes = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
    try {
      const response = await fetch(maxRes, { method: "HEAD" })
      if (response.ok) return maxRes
      return `https://img.youtube.com/vi/${youtubeId}/sddefault.jpg`
    } catch {
      return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    }
  }

  // 4. Return fallback
  return fallbackImage || ""
}

/**
 * Get best cover/poster image
 * Priority: AniList extraLarge > Shikimori original > MAL large
 */
export async function getBestCoverImage(
  title: string,
  malId?: number,
  fallbackImage?: string
): Promise<string> {
  // 1. Try AniList first
  const anilistData = await getAniListBanner(title)
  if (anilistData?.coverImage?.extraLarge) {
    return anilistData.coverImage.extraLarge
  }

  // 2. Try Shikimori
  if (malId) {
    const shikimoriData = await getShikimoriByMalId(malId)
    if (shikimoriData?.image?.original) {
      return `https://shikimori.one${shikimoriData.image.original}`
    }
  }

  return fallbackImage || ""
}
