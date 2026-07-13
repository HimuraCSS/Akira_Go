// Anime robots — declarative scraping definitions built on the Maxun-style engine.
//
// Each robot points the shared field schema at a different MyAnimeList ranking
// page, turning those server-rendered pages into a structured anime API. Because
// every ranking page reuses the same ".ranking-list" row markup, one schema
// powers them all — that is the Maxun idea: describe once, scrape anywhere.

import type { AnimeData } from "@/components/anitracker/anime-card"
import type { RobotDefinition, RobotRecord } from "./types"

const BASE_URL = "https://myanimelist.net"
const PAGE_SIZE = 50

// Upscale MAL's tiny "/r/50x70/" thumbnails to the full-size image and drop the
// signed query string.
function fullImage(raw: string): string {
  return raw.replace(/\/r\/\d+x\d+\//, "/").split("?")[0]
}

// Shared field schema for a ".ranking-list" row. Multiple fallback selectors
// keep extraction working if MAL tweaks its markup.
const RANKING_FIELDS: RobotDefinition["fields"] = {
  malId: {
    selector: [".title .hoverinfo_trigger", ".detail .hoverinfo_trigger", "a.hoverinfo_trigger"],
    type: "attr",
    attr: "href",
    transform: (raw) => Number.parseInt(raw.match(/\/anime\/(\d+)/)?.[1] || "0", 10),
  },
  title: {
    selector: ["h3.anime_ranking_h3 a", ".title h3 a", ".detail .di-t a"],
    type: "text",
  },
  poster: {
    selector: [".ranking-list img", "img.lazyload", "img"],
    type: "attr",
    attr: "data-src",
    transform: (raw) => fullImage(raw),
  },
  posterFallback: {
    selector: [".ranking-list img", "img"],
    type: "attr",
    attr: "src",
    transform: (raw) => fullImage(raw),
  },
  score: {
    selector: [".js-top-ranking-score-col .text", ".score .text", ".score"],
    type: "text",
  },
  info: {
    selector: [".information", ".detail .information"],
    type: "text",
  },
}

const SHARED: Pick<
  RobotDefinition,
  "source" | "baseUrl" | "listSelector" | "fields" | "pagination"
> = {
  source: "MyAnimeList",
  baseUrl: BASE_URL,
  listSelector: [".ranking-list"],
  fields: RANKING_FIELDS,
}

const offset = (page: number) => (Math.max(1, page) - 1) * PAGE_SIZE

// The robot catalog. Each entry turns a ranking page into a structured API.
export const ANIME_ROBOTS: Record<string, RobotDefinition> = {
  top: {
    ...SHARED,
    id: "top",
    name: "Top Ranqueados",
    description: "Os animes com melhor nota de todos os tempos.",
    buildUrl: ({ page = 1 }) => `${BASE_URL}/topanime.php?limit=${offset(page)}`,
  },
  airing: {
    ...SHARED,
    id: "airing",
    name: "No Ar Agora",
    description: "Os animes em exibição mais bem avaliados.",
    buildUrl: ({ page = 1 }) => `${BASE_URL}/topanime.php?type=airing&limit=${offset(page)}`,
  },
  upcoming: {
    ...SHARED,
    id: "upcoming",
    name: "Em Breve",
    description: "Próximos lançamentos mais aguardados.",
    buildUrl: ({ page = 1 }) => `${BASE_URL}/topanime.php?type=upcoming&limit=${offset(page)}`,
  },
  popular: {
    ...SHARED,
    id: "popular",
    name: "Mais Populares",
    description: "Os títulos com mais membros na comunidade.",
    buildUrl: ({ page = 1 }) => `${BASE_URL}/topanime.php?type=bypopularity&limit=${offset(page)}`,
  },
  favorite: {
    ...SHARED,
    id: "favorite",
    name: "Mais Favoritados",
    description: "Os títulos mais favoritados pelos usuários.",
    buildUrl: ({ page = 1 }) => `${BASE_URL}/topanime.php?type=favorite&limit=${offset(page)}`,
  },
}

// Status hint per robot, since a ranking row doesn't state airing status itself.
const ROBOT_STATUS: Record<string, AnimeData["status"]> = {
  airing: "Airing",
  upcoming: "Upcoming",
  top: "Completed",
  popular: "Completed",
  favorite: "Completed",
}

export function getRobot(id: string): RobotDefinition | null {
  return ANIME_ROBOTS[id] ?? null
}

export function listRobots() {
  return Object.values(ANIME_ROBOTS).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    source: r.source,
  }))
}

// Parse MAL's ".information" line, e.g. "TV (28 eps) Sep 2023 - Mar 2024 1,479,959 members".
function parseInfo(info: string): { type: string; episodes: number | null; year?: number } {
  const type = info.match(/^\s*([A-Za-z]+)/)?.[1] || ""
  const epsMatch = info.match(/\((\d+|\?)\s*eps?\)/)
  const episodes = epsMatch && epsMatch[1] !== "?" ? Number.parseInt(epsMatch[1], 10) : null
  const year = Number.parseInt(info.match(/\b(19|20)\d{2}\b/)?.[0] || "", 10)
  return { type, episodes, year: Number.isNaN(year) ? undefined : year }
}

// Map a raw robot record into the app's AnimeData shape.
export function recordToAnimeData(record: RobotRecord, robotId?: string): AnimeData {
  const malId = Number(record.malId || 0)
  const { type, episodes, year } = parseInfo(String(record.info || ""))
  const scoreRaw = String(record.score || "")
  const score = Number.parseFloat(scoreRaw.replace(/[^\d.]/g, ""))

  return {
    id: malId ? String(malId) : String(record.title || ""),
    malId: malId || undefined,
    title: String(record.title || "Sem título"),
    image: String(record.poster || record.posterFallback || "/placeholder.svg"),
    score: Number.isNaN(score) ? 0 : score,
    episodes,
    status: (robotId && ROBOT_STATUS[robotId]) || "Completed",
    synopsis: "",
    genres: type ? [type] : [],
    year,
  }
}
