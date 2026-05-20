// HiAnime API Constants
export const HIANIME_BASE_URL = "https://hianimez.to"
export const HIANIME_AJAX_URL = `${HIANIME_BASE_URL}/ajax`

export const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

export const ACCEPT_HEADER = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"

export const ACCEPT_ENCODING = "gzip, deflate, br"

export const DEFAULT_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": ACCEPT_HEADER,
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": HIANIME_BASE_URL,
}

// Server names mapping
export const SERVER_NAMES: Record<string, string> = {
  "hd-1": "HD-1",
  "hd-2": "HD-2",
  "megacloud": "MegaCloud",
  "streamsb": "StreamSB",
  "streamtape": "Streamtape",
  "vidstreaming": "Vidstreaming",
  "vidcloud": "Vidcloud",
}

// Extractor types
export type ServerType = "sub" | "dub" | "raw"
