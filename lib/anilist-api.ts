"use server"

// AniList GraphQL API for anime metadata
const ANILIST_API = "https://graphql.anilist.co"

export interface AniListAnime {
  id: number
  idMal: number | null
  title: {
    romaji: string
    english: string | null
    native: string
  }
  description: string | null
  episodes: number | null
  status: string
  season: string | null
  seasonYear: number | null
  averageScore: number | null
  popularity: number
  genres: string[]
  coverImage: {
    large: string
    medium: string
  }
  bannerImage: string | null
  studios: {
    nodes: { name: string }[]
  }
  streamingEpisodes: {
    title: string
    thumbnail: string
    url: string
    site: string
  }[]
}

export interface AniListEpisode {
  id: string
  number: number
  title: string
  thumbnail: string
  site: string
  url: string
}

// Search anime by title
export async function searchAniList(query: string, page: number = 1, perPage: number = 20): Promise<AniListAnime[]> {
  const graphqlQuery = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
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
          popularity
          genres
          coverImage {
            large
            medium
          }
          bannerImage
          studios(isMain: true) {
            nodes {
              name
            }
          }
          streamingEpisodes {
            title
            thumbnail
            url
            site
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
        query: graphqlQuery,
        variables: { search: query, page, perPage },
      }),
    })

    if (!response.ok) {
      throw new Error("AniList API error")
    }

    const data = await response.json()
    return data.data?.Page?.media || []
  } catch (error) {
    console.error("[v0] AniList search error:", error)
    return []
  }
}

// Get anime details by ID
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
        popularity
        genres
        coverImage {
          large
          medium
        }
        bannerImage
        studios(isMain: true) {
          nodes {
            name
          }
        }
        streamingEpisodes {
          title
          thumbnail
          url
          site
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

    if (!response.ok) {
      throw new Error("AniList API error")
    }

    const data = await response.json()
    return data.data?.Media || null
  } catch (error) {
    console.error("[v0] AniList get anime error:", error)
    return null
  }
}

// Get trending anime
export async function getTrendingAniList(page: number = 1, perPage: number = 20): Promise<AniListAnime[]> {
  const graphqlQuery = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, status_in: [RELEASING, FINISHED]) {
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
          popularity
          genres
          coverImage {
            large
            medium
          }
          bannerImage
          studios(isMain: true) {
            nodes {
              name
            }
          }
          streamingEpisodes {
            title
            thumbnail
            url
            site
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
        query: graphqlQuery,
        variables: { page, perPage },
      }),
    })

    if (!response.ok) {
      throw new Error("AniList API error")
    }

    const data = await response.json()
    return data.data?.Page?.media || []
  } catch (error) {
    console.error("[v0] AniList trending error:", error)
    return []
  }
}

// Get popular anime
export async function getPopularAniList(page: number = 1, perPage: number = 20): Promise<AniListAnime[]> {
  const graphqlQuery = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC) {
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
          popularity
          genres
          coverImage {
            large
            medium
          }
          bannerImage
          studios(isMain: true) {
            nodes {
              name
            }
          }
          streamingEpisodes {
            title
            thumbnail
            url
            site
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
        query: graphqlQuery,
        variables: { page, perPage },
      }),
    })

    if (!response.ok) {
      throw new Error("AniList API error")
    }

    const data = await response.json()
    return data.data?.Page?.media || []
  } catch (error) {
    console.error("[v0] AniList popular error:", error)
    return []
  }
}

// Convert AniList anime to our AnimeData format
export function aniListToAnimeData(anime: AniListAnime) {
  return {
    id: anime.id.toString(),
    malId: anime.idMal,
    title: anime.title.english || anime.title.romaji,
    titleJapanese: anime.title.native,
    image: anime.coverImage.large,
    bannerImage: anime.bannerImage,
    synopsis: anime.description?.replace(/<[^>]*>/g, "") || "",
    score: anime.averageScore ? anime.averageScore / 10 : 0,
    episodes: anime.episodes || 0,
    status: anime.status,
    season: anime.season,
    year: anime.seasonYear || 0,
    genres: anime.genres,
    studio: anime.studios.nodes[0]?.name || "Unknown",
    streamingEpisodes: anime.streamingEpisodes,
  }
}
