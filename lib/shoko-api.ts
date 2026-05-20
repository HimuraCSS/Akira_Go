/**
 * Shoko Server API Client
 * 
 * Integrates with Shoko Server (https://shokoanime.com) for local anime library management.
 * Shoko Server runs on port 8111 by default and provides a REST API v3.
 */

export interface ShokoConfig {
  baseUrl: string // e.g., "http://localhost:8111"
  apiKey: string
}

export interface ShokoSeries {
  IDs: {
    ID: number
    AniDB: number
    TvDB?: number[]
    TMDB?: { Show?: number[]; Movie?: number[] }
    MAL?: number[]
  }
  Name: string
  Size: number
  Sizes: {
    Total: { Episodes: number; Specials: number }
    Local: { Episodes: number; Specials: number }
    Watched: { Episodes: number; Specials: number }
  }
  Created: string
  Updated: string
  AirDate?: string
  EndDate?: string
  Overview?: string
  Images?: {
    Posters?: ShokoImage[]
    Backdrops?: ShokoImage[]
    Banners?: ShokoImage[]
  }
  UserRating?: {
    Value: number
    MaxValue: number
    Type: string
  }
}

export interface ShokoImage {
  ID: string
  Source: string
  Type: string
  RelativeFilepath: string
  Preferred: boolean
  Width?: number
  Height?: number
}

export interface ShokoEpisode {
  IDs: {
    ID: number
    AniDB: number
    TvDB?: number[]
  }
  Name: string
  Description?: string
  Duration: string
  AirDate?: string
  Size: number
  Watched?: string
  ResumePosition?: number
  EpisodeNumber: number
  Type: string // "Normal", "Special", etc.
  Images?: {
    Thumbnails?: ShokoImage[]
  }
}

export interface ShokoFile {
  ID: number
  Size: number
  Hashes: {
    ED2K: string
    MD5?: string
    SHA1?: string
    CRC32?: string
  }
  Locations: Array<{
    ImportFolderID: number
    RelativePath: string
    Accessible: boolean
  }>
  Duration: string
  Created: string
  Updated: string
  MediaInfo?: {
    Video?: {
      Codec: string
      Resolution: string
      Width: number
      Height: number
      BitRate: number
      FrameRate: number
    }
    Audio?: Array<{
      Codec: string
      Language: string
      Channels: number
    }>
    Subtitles?: Array<{
      Codec: string
      Language: string
    }>
  }
}

export interface ShokoGroup {
  IDs: {
    ID: number
  }
  Name: string
  Size: number
  Sizes: {
    SeriesTypes: Record<string, number>
    Total: { Episodes: number; Specials: number }
    Local: { Episodes: number; Specials: number }
    Watched: { Episodes: number; Specials: number }
  }
  Images?: {
    Posters?: ShokoImage[]
    Backdrops?: ShokoImage[]
  }
}

export interface ShokoUser {
  ID: number
  Username: string
  IsAdmin: boolean
  CommunitySites?: {
    AniDB: boolean
    Trakt: boolean
    Plex: boolean
  }
}

export interface ShokoSearchResult {
  ID: number
  Type: string
  Name: string
  AirDate?: string
  Size?: number
  Overview?: string
  Images?: {
    Posters?: ShokoImage[]
  }
}

export interface ShokoStreamInfo {
  url: string
  mimeType: string
  duration: number
  subtitles: Array<{
    language: string
    url: string
    format: string
  }>
}

// API Response types
interface ShokoListResponse<T> {
  Total: number
  List: T[]
}

/**
 * Shoko Server API Client
 */
export class ShokoClient {
  private baseUrl: string
  private apiKey: string

  constructor(config: ShokoConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "") // Remove trailing slash
    this.apiKey = config.apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v3${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "apikey": this.apiKey,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error")
      throw new Error(`Shoko API Error (${response.status}): ${error}`)
    }

    return response.json()
  }

  /**
   * Test connection to Shoko Server
   */
  async testConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const info = await this.request<{ Version: string }>("/Init/Version")
      return { success: true, version: info.Version }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Connection failed" 
      }
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<ShokoUser> {
    return this.request<ShokoUser>("/User/Current")
  }

  /**
   * Search for series
   */
  async searchSeries(query: string, limit: number = 20): Promise<ShokoSeries[]> {
    const response = await this.request<ShokoListResponse<ShokoSeries>>(
      `/Series?search=${encodeURIComponent(query)}&pageSize=${limit}&includeDataFrom=AniDB,TMDB`
    )
    return response.List || []
  }

  /**
   * Get all series
   */
  async getAllSeries(page: number = 1, pageSize: number = 20): Promise<{ series: ShokoSeries[]; total: number }> {
    const response = await this.request<ShokoListResponse<ShokoSeries>>(
      `/Series?page=${page}&pageSize=${pageSize}&includeDataFrom=AniDB,TMDB`
    )
    return { series: response.List || [], total: response.Total }
  }

  /**
   * Get series by ID
   */
  async getSeries(seriesId: number): Promise<ShokoSeries> {
    return this.request<ShokoSeries>(`/Series/${seriesId}?includeDataFrom=AniDB,TMDB`)
  }

  /**
   * Get series by AniDB ID
   */
  async getSeriesByAniDBId(anidbId: number): Promise<ShokoSeries | null> {
    try {
      const series = await this.request<ShokoSeries[]>(`/Series/AniDB/${anidbId}`)
      return series[0] || null
    } catch {
      return null
    }
  }

  /**
   * Get episodes for a series
   */
  async getEpisodes(seriesId: number, includeWatched: boolean = true): Promise<ShokoEpisode[]> {
    const response = await this.request<ShokoListResponse<ShokoEpisode>>(
      `/Series/${seriesId}/Episode?pageSize=1000&includeWatched=${includeWatched}&includeDataFrom=AniDB,TvDB`
    )
    return response.List || []
  }

  /**
   * Get episode by ID
   */
  async getEpisode(episodeId: number): Promise<ShokoEpisode> {
    return this.request<ShokoEpisode>(`/Episode/${episodeId}?includeDataFrom=AniDB,TvDB`)
  }

  /**
   * Get files for an episode
   */
  async getEpisodeFiles(episodeId: number): Promise<ShokoFile[]> {
    return this.request<ShokoFile[]>(`/Episode/${episodeId}/File`)
  }

  /**
   * Get file stream URL
   */
  getStreamUrl(fileId: number): string {
    return `${this.baseUrl}/api/v3/File/${fileId}/Stream?apikey=${this.apiKey}`
  }

  /**
   * Get file info for streaming
   */
  async getFileStreamInfo(fileId: number): Promise<ShokoStreamInfo | null> {
    try {
      const file = await this.request<ShokoFile>(`/File/${fileId}`)
      
      // Get subtitles if available
      const subtitles = file.MediaInfo?.Subtitles?.map((sub, index) => ({
        language: sub.Language || "Unknown",
        url: `${this.baseUrl}/api/v3/File/${fileId}/Subtitles/${index}?apikey=${this.apiKey}`,
        format: sub.Codec || "srt",
      })) || []

      // Parse duration from "HH:MM:SS" format
      const durationParts = file.Duration.split(":").map(Number)
      const durationSeconds = durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2]

      return {
        url: this.getStreamUrl(fileId),
        mimeType: "video/mp4",
        duration: durationSeconds,
        subtitles,
      }
    } catch {
      return null
    }
  }

  /**
   * Get all groups
   */
  async getGroups(page: number = 1, pageSize: number = 20): Promise<{ groups: ShokoGroup[]; total: number }> {
    const response = await this.request<ShokoListResponse<ShokoGroup>>(
      `/Group?page=${page}&pageSize=${pageSize}`
    )
    return { groups: response.List || [], total: response.Total }
  }

  /**
   * Get continue watching list
   */
  async getContinueWatching(limit: number = 10): Promise<ShokoEpisode[]> {
    const response = await this.request<ShokoListResponse<ShokoEpisode>>(
      `/Episode/InProgress?pageSize=${limit}&includeDataFrom=AniDB`
    )
    return response.List || []
  }

  /**
   * Get recently added series
   */
  async getRecentlyAdded(limit: number = 20): Promise<ShokoSeries[]> {
    const response = await this.request<ShokoListResponse<ShokoSeries>>(
      `/Series?pageSize=${limit}&sortOrder=LastAddedDate&sortDirection=Descending&includeDataFrom=AniDB,TMDB`
    )
    return response.List || []
  }

  /**
   * Mark episode as watched
   */
  async markEpisodeWatched(episodeId: number): Promise<void> {
    await this.request(`/Episode/${episodeId}/Watched`, { method: "POST" })
  }

  /**
   * Mark episode as unwatched
   */
  async markEpisodeUnwatched(episodeId: number): Promise<void> {
    await this.request(`/Episode/${episodeId}/Watched`, { method: "DELETE" })
  }

  /**
   * Update watch progress/resume position
   */
  async updateResumePosition(fileId: number, position: number): Promise<void> {
    await this.request(`/File/${fileId}/Resume/${position}`, { method: "PUT" })
  }

  /**
   * Get image URL
   */
  getImageUrl(image: ShokoImage): string {
    return `${this.baseUrl}/api/v3/Image/${image.Source}/${image.Type}/${image.ID}`
  }

  /**
   * Get poster URL for series
   */
  getPosterUrl(series: ShokoSeries): string | null {
    const poster = series.Images?.Posters?.find(p => p.Preferred) || series.Images?.Posters?.[0]
    return poster ? this.getImageUrl(poster) : null
  }

  /**
   * Get backdrop URL for series
   */
  getBackdropUrl(series: ShokoSeries): string | null {
    const backdrop = series.Images?.Backdrops?.find(b => b.Preferred) || series.Images?.Backdrops?.[0]
    return backdrop ? this.getImageUrl(backdrop) : null
  }
}

/**
 * Create a Shoko client from environment variables or stored config
 */
export function createShokoClient(config?: Partial<ShokoConfig>): ShokoClient | null {
  const baseUrl = config?.baseUrl || process.env.NEXT_PUBLIC_SHOKO_URL
  const apiKey = config?.apiKey || process.env.SHOKO_API_KEY

  if (!baseUrl || !apiKey) {
    return null
  }

  return new ShokoClient({ baseUrl, apiKey })
}

/**
 * Transform Shoko series to AKIRA Go AnimeData format
 */
export function transformShokoSeries(series: ShokoSeries, client: ShokoClient): {
  id: string
  title: string
  image: string
  score: number | null
  episodes: number | null
  status: string
  synopsis: string
  genres: string[]
  year: number | null
  studio: string
  anidbId: number
  malId: number | null
} {
  return {
    id: `shoko-${series.IDs.ID}`,
    title: series.Name,
    image: client.getPosterUrl(series) || "/placeholder.jpg",
    score: series.UserRating?.Value || null,
    episodes: series.Sizes.Total.Episodes,
    status: series.EndDate ? "Finished" : "Ongoing",
    synopsis: series.Overview || "",
    genres: [],
    year: series.AirDate ? new Date(series.AirDate).getFullYear() : null,
    studio: "",
    anidbId: series.IDs.AniDB,
    malId: series.IDs.MAL?.[0] || null,
  }
}

/**
 * Transform Shoko episode to AKIRA Go episode format
 */
export function transformShokoEpisode(
  episode: ShokoEpisode, 
  series: ShokoSeries,
  client: ShokoClient
): {
  id: string
  number: number
  title: string
  thumbnail: string
  duration: string
  animeId: string
  animeTitle: string
  watched: boolean
  resumePosition: number
} {
  return {
    id: `shoko-ep-${episode.IDs.ID}`,
    number: episode.EpisodeNumber,
    title: episode.Name || `Episode ${episode.EpisodeNumber}`,
    thumbnail: episode.Images?.Thumbnails?.[0] 
      ? client.getImageUrl(episode.Images.Thumbnails[0])
      : client.getPosterUrl(series) || "/placeholder.jpg",
    duration: episode.Duration,
    animeId: `shoko-${series.IDs.ID}`,
    animeTitle: series.Name,
    watched: !!episode.Watched,
    resumePosition: episode.ResumePosition || 0,
  }
}
