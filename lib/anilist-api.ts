"use client"

// AniList GraphQL API for anime metadata
const ANILIST_API = "https://graphql.anilist.co"

export interface AniListAnime {
  id: number
  idMal: number | null
  title: {
    romaji: string
    english: string | null
    native: string | null
  }
  description: string | null
  episodes: number | null
  status: string
  season: string | null
  seasonYear: number | null
  averageScore: number | null
  genres: string[]
  coverImage: {
    large: string
    extraLarge: string
  }
  bannerImage: string | null
  studios: {
    nodes: { name: string }[]
  }
  nextAiringEpisode: {
    episode: number
    airingAt: number
  } | null
}

export interface AniListSearchResult {
  id: number
  idMal: number | null
  title: {
    romaji: string
    english: string | null
  }
  coverImage: {
    large: string
  }
  episodes: number | null
  averageScore: number | null
  status: string
}

// Search anime by title
export async function searchAniListAnime(query: string): Promise<AniListSearchResult[]> {
  const graphqlQuery = `
    query ($search: String) {
      Page(page: 1, perPage: 20) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id
          idMal
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          episodes
          averageScore
          status
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
        query: graphqlQuery,
        variables: { search: query },
      }),
    })

    const data = await response.json()
    return data?.data?.Page?.media || []
  } catch (error) {
    console.error("[v0] AniList search error:", error)
    return []
  }
}

// Get full anime details
export async function getAniListAnime(id: number): Promise<AniListAnime | null> {
  const graphqlQuery = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        description
        episodes
        status
        season
        seasonYear
        averageScore
        genres
        coverImage {
          large
          extraLarge
        }
        bannerImage
        studios(isMain: true) {
          nodes {
            name
          }
        }
        nextAiringEpisode {
          episode
          airingAt
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
        query: graphqlQuery,
        variables: { id },
      }),
    })

    const data = await response.json()
    return data?.data?.Media || null
  } catch (error) {
    console.error("[v0] AniList get anime error:", error)
    return null
  }
}

// Get trending anime
export async function getTrendingAniList(page: number = 1): Promise<AniListSearchResult[]> {
  const graphqlQuery = `
    query ($page: Int) {
      Page(page: $page, perPage: 20) {
        media(type: ANIME, sort: TRENDING_DESC, status_in: [RELEASING, FINISHED]) {
          id
          idMal
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          episodes
          averageScore
          status
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
        query: graphqlQuery,
        variables: { page },
      }),
    })

    const data = await response.json()
    return data?.data?.Page?.media || []
  } catch (error) {
    console.error("[v0] AniList trending error:", error)
    return []
  }
}

// Get popular anime
export async function getPopularAniList(page: number = 1): Promise<AniListSearchResult[]> {
  const graphqlQuery = `
    query ($page: Int) {
      Page(page: $page, perPage: 20) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          idMal
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          episodes
          averageScore
          status
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
        query: graphqlQuery,
        variables: { page },
      }),
    })

    const data = await response.json()
    return data?.data?.Page?.media || []
  } catch (error) {
    console.error("[v0] AniList popular error:", error)
    return []
  }
}

// Convert AniList result to our AnimeData format
export function aniListToAnimeData(anime: AniListSearchResult | AniListAnime): {
  id: string
  title: string
  image: string
  episodes: number
  score: number
  status: string
  year?: number
  synopsis?: string
  genres?: string[]
  studio?: string
  bannerImage?: string
} {
  const isFullAnime = 'description' in anime
  
  return {
    id: `anilist-${anime.id}`,
    title: anime.title.english || anime.title.romaji,
    image: anime.coverImage.large,
    episodes: anime.episodes || 0,
    score: (anime.averageScore || 0) / 10,
    status: anime.status,
    year: isFullAnime ? (anime as AniListAnime).seasonYear || undefined : undefined,
    synopsis: isFullAnime ? (anime as AniListAnime).description?.replace(/<[^>]*>/g, '') || undefined : undefined,
    genres: isFullAnime ? (anime as AniListAnime).genres : undefined,
    studio: isFullAnime ? (anime as AniListAnime).studios?.nodes?.[0]?.name : undefined,
    bannerImage: isFullAnime ? (anime as AniListAnime).bannerImage || undefined : undefined,
  }
}
