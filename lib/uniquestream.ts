/**
 * UniqueStream Provider Integration
 * 
 * UniqueStream uses AniList IDs internally (shown as "AL #XXXXX" in the UI).
 * The embed URL format is: https://anime.uniquestream.net/embed/{anilistId}/{episode}
 * 
 * Features:
 * - Multi-audio support (PT-BR, EN, ES, DE, FR, IT, JA, etc.)
 * - No Cloudflare protection
 * - Clean player interface
 * - Can be used in iframes
 */

// UniqueStream embed URL format
// Based on analysis: they use AniList ID directly for embeds
const UNIQUESTREAM_EMBED_BASE = "https://anime.uniquestream.net/embed"

// API to convert MAL ID to AniList ID
const IDS_MOE_API = "https://ids.moe"

interface IdsMoeResponse {
  title?: string
  anilist?: number
  myanimelist?: number
  [key: string]: unknown
}

/**
 * Convert MAL ID to AniList ID using ids.moe API
 */
export async function malIdToAnilistId(malId: number): Promise<number | null> {
  try {
    const res = await fetch(`${IDS_MOE_API}/mal/${malId}`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "AkiraGo/1.0"
      },
      // Short timeout since this is an external API
      signal: AbortSignal.timeout(5000)
    })
    
    if (!res.ok) {
      console.error(`[UniqueStream] ids.moe API error: ${res.status}`)
      return null
    }
    
    const data: IdsMoeResponse = await res.json()
    return data.anilist || null
  } catch (error) {
    console.error("[UniqueStream] Error fetching AniList ID:", error)
    return null
  }
}

/**
 * Generate UniqueStream embed URL
 * 
 * @param anilistId - AniList ID of the anime
 * @param episode - Episode number (1-indexed)
 * @returns Embed URL for iframe
 */
export function generateUniqueStreamUrl(
  anilistId: number,
  episode: number
): string {
  return `${UNIQUESTREAM_EMBED_BASE}/${anilistId}/${episode}`
}

/**
 * Generate UniqueStream embed URL from MAL ID
 * Automatically converts MAL ID to AniList ID
 * 
 * @param malId - MyAnimeList ID
 * @param episode - Episode number
 * @returns Embed URL or null if conversion fails
 */
export async function generateUniqueStreamUrlFromMal(
  malId: number,
  episode: number
): Promise<string | null> {
  const anilistId = await malIdToAnilistId(malId)
  
  if (!anilistId) {
    // Fallback: Use MAL ID directly (sometimes works)
    return `${UNIQUESTREAM_EMBED_BASE}/${malId}/${episode}`
  }
  
  return generateUniqueStreamUrl(anilistId, episode)
}

/**
 * Get UniqueStream source info
 */
export function getUniqueStreamSource(
  anilistId: number,
  episode: number
) {
  return {
    id: "uniquestream-multidub",
    name: "UniqueStream Multi-Dub",
    shortName: "UStream",
    quality: "FHD",
    url: generateUniqueStreamUrl(anilistId, episode),
    type: "iframe" as const,
    provider: "uniquestream",
    hasSubtitles: true,
    subtitleLanguages: [
      "Portuguese (Brazil)",
      "English", 
      "Spanish",
      "German",
      "French",
      "Italian",
      "Hindi",
      "Arabic",
      "Japanese"
    ],
    audioLanguages: [
      "Portuguese (Brazil)",
      "English",
      "Spanish (Latin America)",
      "Spanish (Spain)",
      "German",
      "French",
      "Italian",
      "Hindi",
      "Arabic",
      "Thai",
      "Indonesian",
      "Japanese"
    ],
    hasPTBR: true,
    notes: "12+ audio languages including PT-BR! Change audio via player settings."
  }
}

// Common MAL ID to AniList ID mappings (cache for popular anime)
// This avoids API calls for frequently accessed anime
export const POPULAR_ANIME_MAPPINGS: Record<number, number> = {
  // MAL ID -> AniList ID
  21: 21,        // One Piece (same ID!)
  1535: 1535,    // Death Note
  5114: 5114,    // FMA Brotherhood
  16498: 16498,  // Attack on Titan
  11757: 11757,  // Sword Art Online
  20: 20,        // Naruto
  1735: 1735,    // Naruto Shippuden
  38000: 101922, // Demon Slayer (different!)
  40748: 113415, // Jujutsu Kaisen (different!)
  30276: 21087,  // One Punch Man (different!)
  31964: 21459,  // My Hero Academia
  21459: 113813, // My Dress-Up Darling
  44511: 105778, // Chainsaw Man
  9253: 9253,    // Steins;Gate
  22319: 22319,  // Tokyo Ghoul
  55830: 162891, // Fate/Strange Fake (different!)
}

/**
 * Get AniList ID with caching
 * Uses local cache first, then API
 */
export async function getAnilistId(malId: number): Promise<number> {
  // Check local cache first
  if (POPULAR_ANIME_MAPPINGS[malId]) {
    return POPULAR_ANIME_MAPPINGS[malId]
  }
  
  // Try API
  const anilistId = await malIdToAnilistId(malId)
  
  // Return AniList ID or fallback to MAL ID (they're often the same)
  return anilistId || malId
}
