// Maxun-inspired declarative scraping engine — runtime.
//
// Given a RobotDefinition, this fetches the target page, finds every repeating
// record and extracts the declared fields into clean, structured objects.
// Designed to run on the server (Next.js route handlers) with cheerio.

import * as cheerio from "cheerio"
import type {
  FieldDefinition,
  RobotDefinition,
  RobotParams,
  RobotRecord,
  RobotRunResult,
} from "./types"

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

// Fetch with a timeout and a couple of retries — scraping targets are flaky.
async function fetchHtml(
  url: string,
  headers: Record<string, string>,
  retries = 2,
): Promise<string> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)
      const res = await fetch(url, { headers, signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (error) {
      lastError = error
      // small backoff before retrying
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Fetch failed")
}

// Normalize a selector definition to an ordered list of candidates.
function toSelectorList(selector: string | string[]): string[] {
  return Array.isArray(selector) ? selector : [selector]
}

// Extract a single field from a record element, honoring fallback selectors.
function extractField(
  $: cheerio.CheerioAPI,
  $record: cheerio.Cheerio<import("domhandler").Element>,
  def: FieldDefinition,
): string | number | boolean {
  const type = def.type ?? "text"
  const selectors = toSelectorList(def.selector)

  for (const sel of selectors) {
    // An empty selector means "use the record element itself".
    const $el = sel ? $record.find(sel).first() : $record
    if (!$el || $el.length === 0) continue

    let raw = ""
    switch (type) {
      case "exists":
        return true
      case "attr":
        raw = ($el.attr(def.attr || "") || "").trim()
        break
      case "html":
        raw = ($el.html() || "").trim()
        break
      case "number":
      case "text":
      default:
        raw = $el.text().trim()
        break
    }

    if (!raw) continue

    if (def.transform) return def.transform(raw)
    if (type === "number") {
      const n = Number.parseFloat(raw.replace(/[^\d.]/g, ""))
      return Number.isNaN(n) ? (def.fallback ?? 0) : n
    }
    return raw
  }

  // exists fields that never matched resolve to false
  if (type === "exists") return false
  return def.fallback ?? ""
}

function detectTotalPages(
  $: cheerio.CheerioAPI,
  selector: string | undefined,
  currentPage: number,
): number {
  if (!selector) return currentPage
  let max = currentPage
  $(selector).each((_, el) => {
    const href = $(el).attr("href") || ""
    const text = $(el).text() || ""
    const fromHref = Number.parseInt(href.match(/page=(\d+)/)?.[1] || "", 10)
    const fromText = Number.parseInt(text.trim(), 10)
    if (!Number.isNaN(fromHref)) max = Math.max(max, fromHref)
    if (!Number.isNaN(fromText)) max = Math.max(max, fromText)
  })
  return max
}

/**
 * Run a robot: turn a webpage into an array of structured records.
 */
export async function runRobot<T = RobotRecord>(
  robot: RobotDefinition,
  params: RobotParams = {},
): Promise<RobotRunResult<T>> {
  const startedAt = Date.now()
  const page = Number(params.page) || 1
  const url = robot.buildUrl({ ...params, page })

  const html = await fetchHtml(url, { ...DEFAULT_HEADERS, ...(robot.headers || {}) })
  const $ = cheerio.load(html)

  // Find the repeating record container using the first selector that matches.
  const listSelectors = toSelectorList(robot.listSelector)
  let $records: cheerio.Cheerio<import("domhandler").Element> | null = null
  for (const sel of listSelectors) {
    const found = $(sel)
    if (found.length > 0) {
      $records = found
      break
    }
  }

  const records: RobotRecord[] = []
  const fieldNames = Object.keys(robot.fields)
  const filledFields = new Set<string>()

  if ($records) {
    $records.each((_, el) => {
      const $record = $(el)
      const record: RobotRecord = {}
      for (const name of fieldNames) {
        const value = extractField($, $record, robot.fields[name])
        record[name] = value
        if (value !== "" && value !== 0 && value !== false) filledFields.add(name)
      }
      records.push(record)
    })
  }

  const totalPages = detectTotalPages($, robot.pagination?.totalPagesSelector, page)
  const emptyFields = fieldNames.filter((f) => !filledFields.has(f))

  return {
    records: records as T[],
    page,
    totalPages,
    hasNextPage: page < totalPages,
    meta: {
      robotId: robot.id,
      source: robot.source,
      url,
      durationMs: Date.now() - startedAt,
      fetchedAt: new Date().toISOString(),
      emptyFields,
    },
  }
}
