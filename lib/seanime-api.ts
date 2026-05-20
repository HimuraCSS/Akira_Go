/**
 * Seanime API Client
 * 
 * Integrates with Seanime (https://seanime.app) for local anime library management.
 * Seanime runs on port 43211 by default and provides a REST API v1.
 */

export interface SeanimeConfig {
  baseUrl: string // e.g., "http://localhost:43211"
  token?: string // JWT token after authentication
}

// ============================================================================
// API TYPES
// ============================================================================

export interface SeanimeAnimeEntry {
  id: number
  mediaId: number
  media: SeanimeMedia
  libraryData: {
    allFilesLocked: boolean
    sharedPath: string
  } | null
  listData: {
    progress: number
    score: number
    status: string
    startedAt: string | null
    completedAt: string | null
  } | null
  episodes: SeanimeEpisode[]
  nextEpisode: SeanimeEpisode | null
  localFiles: SeanimeLocalFile[]
  downloadInfo: {
    episodesToDownload: number[]
    rewatch: boolean
    absoluteOffset: number
  } | null
  currentEpisodeCount: number
}

export interface SeanimeMedia {
  id: number
  idMal: number | null
  siteUrl: string
  status: string
  season: string | null
  type: string
  format: string
  bannerImage: string | null
  episodes: number | null
  synonyms: string[]
  isAdult: boolean
  countryOfOrigin: string
  meanScore: number | null
  description: string | null
  trailer: {
    id: string
    site: string
    thumbnail: string
  } | null
  title: {
    userPreferred: string
    romaji: string
    english: string | null
    native: string
  }
  coverImage: {
    extraLarge: string
    large: string
    medium: string
    color: string | null
  }
  startDate: {
    year: number | null
    month: number | null
    day: number | null
  }
  endDate: {
    year: number | null
    month: number | null
    day: number | null
  }
  nextAiringEpisode: {
    airingAt: number
    timeUntilAiring: number
    episode: number
  } | null
  relations: {
    edges: Array<{
      relationType: string
      node: {
        id: number
        title: { userPreferred: string }
        coverImage: { medium: string }
        type: string
        format: string
        status: string
      }
    }>
  }
}

export interface SeanimeEpisode {
  type: string
  displayTitle: string
  episodeTitle: string
  episodeNumber: number
  absoluteEpisodeNumber: number
  progressNumber: number
  localFile: SeanimeLocalFile | null
  isDownloaded: boolean
  episodeMetadata: {
    anidbId: number | null
    tvdbId: number | null
    title: string | null
    airDate: string | null
    length: number | null
    summary: string | null
    overview: string | null
    image: string | null
  } | null
  fileMetadata: {
    aniDBEpisode: string | null
  } | null
  isInvalid: boolean
  metadataIssue: string | null
  basicMedia: {
    id: number
    idMal: number | null
    title: { userPreferred: string }
    coverImage: { large: string }
    bannerImage: string | null
  } | null
}

export interface SeanimeLocalFile {
  path: string
  name: string
  parsedInfo: {
    original: string
    title: string | null
    releaseGroup: string | null
    season: string | null
    seasonRange: number[] | null
    part: string | null
    partRange: number[] | null
    episode: string | null
    episodeRange: number[] | null
    episodeTitle: string | null
    year: string | null
  } | null
  parsedFolderInfo: {
    original: string
    title: string | null
  }[] | null
  metadata: {
    episode: number
    aniDBEpisode: string
    type: string
  } | null
  locked: boolean
  ignored: boolean
  mediaId: number
}

export interface SeanimeLibraryCollection {
  continueWatchingList: SeanimeAnimeEntry[]
  lists: {
    type: string
    status: string
    entries: SeanimeAnimeEntry[]
  }[]
  unmatchedLocalFiles: SeanimeLocalFile[]
  ignoredLocalFiles: SeanimeLocalFile[]
  unmatchedGroups: any[]
  unknownGroups: any[]
}

export interface SeanimeStreamInfo {
  url: string
  headers: Record<string, string>
  subtitles: Array<{
    url: string
    name: string
    language: string
    isDefault: boolean
  }>
}

export interface SeanimeOnlineStreamEpisode {
  number: number
  title: string | null
  image: string | null
  description: string | null
  airDate: string | null
}

export interface SeanimeOnlineStreamSource {
  url: string
  type: string
  quality: string
  subtitles: Array<{
    url: string
    language: string
  }>
  headers: Record<string, string> | null
}

// ============================================================================
// API CLIENT
// ============================================================================

export class SeanimeClient {
  private baseUrl: string
  private token: string | null

  constructor(config: SeanimeConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "")
    this.token = config.token || null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Seanime API error ${response.status}: ${error}`)
    }

    return response.json()
  }

  // Auth
  async getStatus(): Promise<{ status: string; version: string }> {
    return this.request("/status")
  }

  async login(username: string, password: string): Promise<{ token: string }> {
    const result = await this.request<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })
    this.token = result.token
    return result
  }

  // Library
  async getLibraryCollection(): Promise<SeanimeLibraryCollection> {
    return this.request("/library/collection")
  }

  async getAnimeEntry(mediaId: number): Promise<SeanimeAnimeEntry> {
    return this.request(`/library/anime-entry/${mediaId}`)
  }

  async scanLibrary(): Promise<void> {
    await this.request("/library/scan", { method: "POST" })
  }

  // Streaming - Local files
  async getStreamInfo(path: string): Promise<SeanimeStreamInfo> {
    return this.request("/mediastream/transcode/file", {
      method: "POST",
      body: JSON.stringify({ path }),
    })
  }

  async getDirectStreamUrl(path: string): Promise<string> {
    // Direct stream endpoint
    const encodedPath = encodeURIComponent(path)
    return `${this.baseUrl}/api/v1/directstream/stream/${encodedPath}`
  }

  // Online Streaming
  async getOnlineStreamEpisodes(
    mediaId: number,
    dubbed: boolean = false,
    provider?: string
  ): Promise<SeanimeOnlineStreamEpisode[]> {
    const params = new URLSearchParams({
      mediaId: mediaId.toString(),
      dubbed: dubbed.toString(),
    })
    if (provider) params.set("provider", provider)
    
    return this.request(`/onlinestream/episode-list?${params}`)
  }

  async getOnlineStreamSource(
    mediaId: number,
    episodeNumber: number,
    dubbed: boolean = false,
    provider?: string
  ): Promise<SeanimeOnlineStreamSource> {
    const params = new URLSearchParams({
      mediaId: mediaId.toString(),
      episodeNumber: episodeNumber.toString(),
      dubbed: dubbed.toString(),
    })
    if (provider) params.set("provider", provider)
    
    return this.request(`/onlinestream/episode-source?${params}`)
  }

  // Progress
  async updateProgress(mediaId: number, progress: number): Promise<void> {
    await this.request("/anime-entry/update-progress", {
      method: "POST",
      body: JSON.stringify({ mediaId, progress }),
    })
  }

  // AniList
  async getAniListCollection(): Promise<any> {
    return this.request("/anilist/collection")
  }

  async getMediaDetails(mediaId: number): Promise<any> {
    return this.request(`/anilist/media-details/${mediaId}`)
  }

  // Search
  async searchAniList(query: string): Promise<SeanimeMedia[]> {
    return this.request(`/anilist/list-anime?search=${encodeURIComponent(query)}`)
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform Seanime anime to AKIRA Go format
 */
export function transformSeanimeAnime(entry: SeanimeAnimeEntry): {
  id: string
  title: string
  image: string
  score: number
  episodes: number
  status: string
  synopsis: string
  genres: string[]
  year: number
  progress: number
  nextEpisode: number | null
} {
  return {
    id: entry.mediaId.toString(),
    title: entry.media.title.userPreferred || entry.media.title.romaji,
    image: entry.media.coverImage.extraLarge || entry.media.coverImage.large,
    score: entry.media.meanScore || 0,
    episodes: entry.media.episodes || 0,
    status: entry.media.status,
    synopsis: entry.media.description || "",
    genres: [],
    year: entry.media.startDate.year || 0,
    progress: entry.listData?.progress || 0,
    nextEpisode: entry.nextEpisode?.episodeNumber || null,
  }
}

/**
 * Transform Seanime episode to AKIRA Go format
 */
export function transformSeanimeEpisode(episode: SeanimeEpisode): {
  id: string
  number: number
  title: string
  thumbnail: string | null
  duration: string
  isDownloaded: boolean
  localFilePath: string | null
} {
  return {
    id: `${episode.basicMedia?.id || 0}-ep-${episode.episodeNumber}`,
    number: episode.episodeNumber,
    title: episode.displayTitle || episode.episodeTitle || `Episode ${episode.episodeNumber}`,
    thumbnail: episode.episodeMetadata?.image || null,
    duration: episode.episodeMetadata?.length ? `${episode.episodeMetadata.length}:00` : "24:00",
    isDownloaded: episode.isDownloaded,
    localFilePath: episode.localFile?.path || null,
  }
}

/**
 * Get Seanime config from localStorage
 */
export function getSeanimeConfig(): SeanimeConfig | null {
  if (typeof window === "undefined") return null
  
  const stored = localStorage.getItem("seanime_config")
  if (!stored) return null
  
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Save Seanime config to localStorage
 */
export function saveSeanimeConfig(config: SeanimeConfig): void {
  if (typeof window === "undefined") return
  localStorage.setItem("seanime_config", JSON.stringify(config))
}

/**
 * Remove Seanime config from localStorage
 */
export function removeSeanimeConfig(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("seanime_config")
}
