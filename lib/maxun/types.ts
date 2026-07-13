// Maxun-inspired declarative scraping engine — type definitions.
//
// The idea (borrowed from https://github.com/getmaxun/maxun): instead of
// writing a bespoke scraper for every site, you describe a "robot" declaratively
// — which page to load, which element repeats, and which fields to pull out of
// each element. The engine turns any website into a structured, typed API.

export type FieldType = "text" | "attr" | "html" | "number" | "exists"

export interface FieldDefinition {
  /**
   * CSS selector, relative to each record element. You may pass an array of
   * selectors: the engine tries each in order and uses the first that yields a
   * value. This is what lets a robot survive small layout changes on the source
   * site (a core Maxun feature).
   */
  selector: string | string[]
  /** How to read the value out of the matched element. Defaults to "text". */
  type?: FieldType
  /** Attribute name to read when type is "attr" (e.g. "href", "data-src"). */
  attr?: string
  /** Optional post-processing applied to the raw extracted value. */
  transform?: (raw: string) => string | number | boolean
  /** Fallback value used when nothing is matched. */
  fallback?: string | number | boolean
}

export interface RobotParams {
  page?: number
  query?: string
  [key: string]: unknown
}

export interface RobotDefinition {
  /** Stable slug used in the API route (e.g. "latest"). */
  id: string
  /** Human-friendly name shown in the UI. */
  name: string
  /** Short description of what the robot collects. */
  description: string
  /** Label for the underlying source website. */
  source: string
  /** Base URL of the source site. */
  baseUrl: string
  /** Builds the absolute URL to fetch for the given params. */
  buildUrl: (params: RobotParams) => string
  /** Selector for the repeating record container. Supports fallbacks. */
  listSelector: string | string[]
  /** Field schema: fieldName -> how to extract it from each record. */
  fields: Record<string, FieldDefinition>
  /** Optional pagination hints. */
  pagination?: {
    /** Selector whose href/text reveals the last page number. */
    totalPagesSelector?: string
  }
  /** Extra request headers. */
  headers?: Record<string, string>
}

export type RobotRecord = Record<string, string | number | boolean>

export interface RobotRunMeta {
  robotId: string
  source: string
  url: string
  durationMs: number
  fetchedAt: string
  /** Fields that came back empty for every record — useful to detect breakage. */
  emptyFields: string[]
}

export interface RobotRunResult<T = RobotRecord> {
  records: T[]
  page: number
  totalPages: number
  hasNextPage: boolean
  meta: RobotRunMeta
}
